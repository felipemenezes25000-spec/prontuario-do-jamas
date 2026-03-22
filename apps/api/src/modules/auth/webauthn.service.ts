import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface StoredCredential {
  credentialID: string;
  credentialPublicKey: string; // base64-encoded
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  registeredAt: string;
  deviceName?: string;
}

interface UserSettings {
  webauthnCredentials?: StoredCredential[];
  [key: string]: unknown;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface WebAuthnAuthResponse extends TokenPair {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  };
}

@Injectable()
export class WebAuthnService {
  private readonly logger = new Logger(WebAuthnService.name);
  private readonly challengeStore = new Map<string, { challenge: string; expiresAt: number }>();
  private readonly CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly RP_NAME = 'VoxPEP';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  private getRpID(): string {
    const appUrl = this.configService.get<string>('app.url', 'http://localhost:5173');
    try {
      const url = new URL(appUrl);
      return url.hostname;
    } catch {
      return 'localhost';
    }
  }

  private getExpectedOrigin(): string {
    return this.configService.get<string>('app.url', 'http://localhost:5173');
  }

  private storeChallenge(key: string, challenge: string): void {
    this.challengeStore.set(key, {
      challenge,
      expiresAt: Date.now() + this.CHALLENGE_TTL_MS,
    });
  }

  private consumeChallenge(key: string): string | null {
    const entry = this.challengeStore.get(key);
    if (!entry) return null;

    this.challengeStore.delete(key);

    if (Date.now() > entry.expiresAt) {
      return null;
    }

    return entry.challenge;
  }

  private getUserSettings(settingsRaw: unknown): UserSettings {
    if (settingsRaw && typeof settingsRaw === 'object') {
      return settingsRaw as UserSettings;
    }
    return {};
  }

  private getStoredCredentials(settingsRaw: unknown): StoredCredential[] {
    const settings = this.getUserSettings(settingsRaw);
    return settings.webauthnCredentials ?? [];
  }

  // ===== Registration =====

  async generateRegistrationOptions(
    userId: string,
    userName: string,
    userDisplayName: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const existingCredentials = this.getStoredCredentials(user.settings);

    const options = await generateRegistrationOptions({
      rpName: this.RP_NAME,
      rpID: this.getRpID(),
      userName,
      userDisplayName,
      attestationType: 'none',
      excludeCredentials: existingCredentials.map((cred) => ({
        id: cred.credentialID,
        transports: cred.transports,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Store the challenge keyed by userId + 'register'
    this.storeChallenge(`register:${userId}`, options.challenge);

    return options;
  }

  async verifyRegistration(
    userId: string,
    credential: RegistrationResponseJSON,
  ) {
    const expectedChallenge = this.consumeChallenge(`register:${userId}`);
    if (!expectedChallenge) {
      throw new BadRequestException('Registration challenge expired or not found. Please restart registration.');
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: this.getExpectedOrigin(),
      expectedRPID: this.getRpID(),
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('WebAuthn registration verification failed');
    }

    const { credential: registrationCredential, credentialDeviceType } = verification.registrationInfo;

    const newCredential: StoredCredential = {
      credentialID: registrationCredential.id,
      credentialPublicKey: Buffer.from(registrationCredential.publicKey).toString('base64'),
      counter: registrationCredential.counter,
      transports: credential.response.transports as AuthenticatorTransportFuture[] | undefined,
      registeredAt: new Date().toISOString(),
      deviceName: credentialDeviceType === 'multiDevice' ? 'Dispositivo Multifator' : 'Chave de Segurança',
    };

    // Add to user settings
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    const settings = this.getUserSettings(user?.settings);
    const credentials = settings.webauthnCredentials ?? [];
    credentials.push(newCredential);
    settings.webauthnCredentials = credentials;

    await this.prisma.user.update({
      where: { id: userId },
      data: { settings: settings as unknown as Prisma.InputJsonValue },
    });

    this.logger.log(`WebAuthn credential registered for user: ${userId}`);

    return { verified: true, credentialID: newCredential.credentialID };
  }

  // ===== Authentication =====

  async generateAuthenticationOptions(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, settings: true, isActive: true },
    });

    if (!user || !user.isActive) {
      // Don't reveal if user exists
      throw new UnauthorizedException('Invalid credentials');
    }

    const storedCredentials = this.getStoredCredentials(user.settings);

    if (storedCredentials.length === 0) {
      throw new BadRequestException('No WebAuthn credentials registered for this account');
    }

    const options = await generateAuthenticationOptions({
      rpID: this.getRpID(),
      allowCredentials: storedCredentials.map((cred) => ({
        id: cred.credentialID,
        transports: cred.transports,
      })),
      userVerification: 'preferred',
    });

    this.storeChallenge(`login:${user.id}`, options.challenge);

    return options;
  }

  async verifyAuthentication(
    email: string,
    credential: AuthenticationResponseJSON,
  ): Promise<WebAuthnAuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        settings: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const storedCredentials = this.getStoredCredentials(user.settings);
    const matchingCredential = storedCredentials.find(
      (c) => c.credentialID === credential.id,
    );

    if (!matchingCredential) {
      throw new UnauthorizedException('Credential not recognized');
    }

    const expectedChallenge = this.consumeChallenge(`login:${user.id}`);
    if (!expectedChallenge) {
      throw new BadRequestException('Authentication challenge expired or not found. Please try again.');
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: this.getExpectedOrigin(),
      expectedRPID: this.getRpID(),
      credential: {
        id: matchingCredential.credentialID,
        publicKey: new Uint8Array(Buffer.from(matchingCredential.credentialPublicKey, 'base64')),
        counter: matchingCredential.counter,
        transports: matchingCredential.transports,
      },
    });

    if (!verification.verified) {
      throw new UnauthorizedException('WebAuthn authentication failed');
    }

    // Update counter
    matchingCredential.counter = verification.authenticationInfo.newCounter;
    const settings = this.getUserSettings(user.settings);
    settings.webauthnCredentials = storedCredentials;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        settings: settings as unknown as Prisma.InputJsonValue,
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

    // Generate JWT tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    this.logger.log(`WebAuthn authentication successful for user: ${user.id}`);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  // ===== Credential Management =====

  async getCredentials(userId: string): Promise<Array<{ credentialID: string; registeredAt: string; deviceName?: string }>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const credentials = this.getStoredCredentials(user.settings);
    return credentials.map((c) => ({
      credentialID: c.credentialID,
      registeredAt: c.registeredAt,
      deviceName: c.deviceName,
    }));
  }

  async removeCredential(userId: string, credentialId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const settings = this.getUserSettings(user.settings);
    const credentials = settings.webauthnCredentials ?? [];
    const index = credentials.findIndex((c) => c.credentialID === credentialId);

    if (index === -1) {
      throw new NotFoundException('Credential not found');
    }

    credentials.splice(index, 1);
    settings.webauthnCredentials = credentials;

    await this.prisma.user.update({
      where: { id: userId },
      data: { settings: settings as unknown as Prisma.InputJsonValue },
    });

    this.logger.log(`WebAuthn credential removed for user: ${userId}, credentialId: ${credentialId}`);

    return { message: 'Credential removed successfully' };
  }

  // ===== Private Helpers =====

  private async generateTokens(payload: {
    sub: string;
    email: string;
    role: string;
    tenantId: string;
  }): Promise<TokenPair> {
    const accessExpiresIn = this.configService.get<number>('jwt.accessExpiration', 900);
    const refreshExpiresIn = this.configService.get<number>('jwt.refreshExpiration', 604800);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
