import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { generateSecret, generateURI, verify as otpVerify, generateSync } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto';
import { UserRole } from '@prisma/client';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends TokenPair {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  };
}

export interface MfaChallengeResponse {
  requiresMfa: true;
  mfaToken: string;
}

export interface MfaSetupResponse {
  qrCodeDataUrl: string;
  secret: string;
  backupCodes: string[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 12;
  private readonly MFA_BACKUP_CODE_COUNT = 10;
  private readonly MFA_BACKUP_CODE_LENGTH = 8;
  private readonly APP_NAME = 'VoxPEP';
  // Allow 1 step (30s) before/after for TOTP verification
  private readonly TOTP_EPOCH_TOLERANCE = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponse | MfaChallengeResponse> {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if MFA is enabled
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { mfaEnabled: true },
    });

    if (fullUser?.mfaEnabled) {
      // Return a short-lived MFA token instead of full access
      const mfaToken = await this.jwtService.signAsync(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          mfaPending: true,
        },
        {
          secret: this.configService.get<string>('jwt.secret'),
          expiresIn: 300, // 5 minutes in seconds
        },
      );

      return {
        requiresMfa: true,
        mfaToken,
      };
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

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

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Check if CPF already exists (if provided)
    if (dto.cpf) {
      const existingCpf = await this.prisma.user.findFirst({
        where: { cpf: dto.cpf },
      });
      if (existingCpf) {
        throw new ConflictException('CPF already registered');
      }
    }

    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });
    if (!tenant) {
      throw new BadRequestException('Invalid tenant ID');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashedPassword,
        name: dto.name,
        cpf: dto.cpf ?? '',
        role: dto.role as UserRole,
        tenantId: dto.tenantId,
      },
    });

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

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

  async refresh(dto: RefreshTokenDto): Promise<TokenPair> {
    let payload: { sub: string; email: string; role: string; tenantId: string };

    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    return tokens;
  }

  async logout(_userId: string): Promise<void> {
    // With stateless JWT, logout is handled client-side by discarding the token.
    // For additional security, implement a token blacklist if needed.
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      this.logger.warn(`Password reset requested for non-existent email: ${email}`);
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // TODO: Send email with reset link using an external token store
    this.logger.log(`Password reset token generated for user: ${user.id}`);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(_token: string, _newPassword: string): Promise<{ message: string }> {
    // TODO: Validate token from an external token store
    throw new BadRequestException('Password reset via token is not yet implemented. Use admin reset.');
  }

  async validateUser(email: string, password: string): Promise<{
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  } | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        cpf: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        mfaEnabled: true,
        doctorProfile: true,
        nurseProfile: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  // ===== MFA Methods =====

  async generateMfaSecret(userId: string): Promise<MfaSetupResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, mfaEnabled: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled. Disable it first to reconfigure.');
    }

    const secret = generateSecret();

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, this.BCRYPT_ROUNDS)),
    );

    // Store secret and backup codes (MFA not yet enabled until verification)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: secret,
        mfaBackupCodes: hashedBackupCodes,
      },
    });

    // Generate QR code
    const otpauthUrl = generateURI({
      issuer: this.APP_NAME,
      label: user.email,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return {
      qrCodeDataUrl,
      secret,
      backupCodes,
    };
  }

  async verifyMfaSetup(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnabled: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    if (!user.mfaSecret) {
      throw new BadRequestException('MFA setup not initiated. Call /auth/mfa/setup first.');
    }

    const result = await otpVerify({
      secret: user.mfaSecret,
      token: code,
      epochTolerance: this.TOTP_EPOCH_TOLERANCE,
    });

    if (!result.valid) {
      throw new UnauthorizedException('Invalid TOTP code. Please try again.');
    }

    // Enable MFA
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    this.logger.log(`MFA enabled for user: ${userId}`);

    return { message: 'MFA enabled successfully' };
  }

  async validateMfaCode(mfaToken: string, code: string): Promise<AuthResponse> {
    let payload: {
      sub: string;
      email: string;
      role: string;
      tenantId: string;
      mfaPending?: boolean;
    };

    try {
      payload = this.jwtService.verify(mfaToken, {
        secret: this.configService.get<string>('jwt.secret'),
      });
    } catch {
      throw new UnauthorizedException('MFA token expired or invalid. Please login again.');
    }

    if (!payload.mfaPending) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        mfaSecret: true,
        mfaEnabled: true,
      },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException('MFA not configured for this user');
    }

    const result = await otpVerify({
      secret: user.mfaSecret,
      token: code,
      epochTolerance: this.TOTP_EPOCH_TOLERANCE,
    });

    if (!result.valid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    // Generate full tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

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

  async validateBackupCode(mfaToken: string, backupCode: string): Promise<AuthResponse> {
    let payload: {
      sub: string;
      email: string;
      role: string;
      tenantId: string;
      mfaPending?: boolean;
    };

    try {
      payload = this.jwtService.verify(mfaToken, {
        secret: this.configService.get<string>('jwt.secret'),
      });
    } catch {
      throw new UnauthorizedException('MFA token expired or invalid. Please login again.');
    }

    if (!payload.mfaPending) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        mfaEnabled: true,
        mfaBackupCodes: true,
      },
    });

    if (!user || !user.mfaEnabled) {
      throw new UnauthorizedException('MFA not configured for this user');
    }

    // Check backup code against stored hashes
    let matchedIndex = -1;
    for (let i = 0; i < user.mfaBackupCodes.length; i++) {
      const isMatch = await bcrypt.compare(backupCode.toUpperCase(), user.mfaBackupCodes[i]);
      if (isMatch) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      throw new UnauthorizedException('Invalid backup code');
    }

    // Remove the used backup code
    const updatedCodes = [...user.mfaBackupCodes];
    updatedCodes.splice(matchedIndex, 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        mfaBackupCodes: updatedCodes,
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

    this.logger.warn(`Backup code used for user: ${user.id}. Remaining: ${updatedCodes.length}`);

    // Generate full tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

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

  async disableMfa(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnabled: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled');
    }

    const result = await otpVerify({
      secret: user.mfaSecret,
      token: code,
      epochTolerance: this.TOTP_EPOCH_TOLERANCE,
    });

    if (!result.valid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
      },
    });

    this.logger.log(`MFA disabled for user: ${userId}`);

    return { message: 'MFA disabled successfully' };
  }

  async regenerateBackupCodes(userId: string, code: string): Promise<{ backupCodes: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnabled: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled');
    }

    const result = await otpVerify({
      secret: user.mfaSecret,
      token: code,
      epochTolerance: this.TOTP_EPOCH_TOLERANCE,
    });

    if (!result.valid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((c) => bcrypt.hash(c, this.BCRYPT_ROUNDS)),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaBackupCodes: hashedBackupCodes },
    });

    this.logger.log(`Backup codes regenerated for user: ${userId}`);

    return { backupCodes };
  }

  getAppUrl(): string {
    return this.configService.get<string>('app.url', 'http://localhost:5173');
  }

  // ===== Private Helpers =====

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding ambiguous: 0/O, 1/I

    for (let i = 0; i < this.MFA_BACKUP_CODE_COUNT; i++) {
      const bytes = crypto.randomBytes(this.MFA_BACKUP_CODE_LENGTH);
      let code = '';
      for (let j = 0; j < this.MFA_BACKUP_CODE_LENGTH; j++) {
        code += chars[bytes[j] % chars.length];
      }
      codes.push(code);
    }

    return codes;
  }

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
