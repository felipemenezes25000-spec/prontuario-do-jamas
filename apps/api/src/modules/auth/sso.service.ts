import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, Prisma } from '@prisma/client';
import type { TokenPair, AuthResponse } from './auth.service';

export interface OAuthProfile {
  provider: string;
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
  raw: Record<string, unknown>;
}

export interface SSOConfigInput {
  ssoEnabled: boolean;
  ssoProvider?: string;
  ssoConfig?: Record<string, unknown>;
  ssoDomain?: string;
  ssoAutoProvision?: boolean;
}

export interface SSODetectResult {
  ssoEnabled: boolean;
  provider: string | null;
  tenantId: string | null;
  tenantName: string | null;
}

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Find or create an OAuth user. If the user exists by email, link the OAuth account.
   * If not, auto-provision if the tenant allows it.
   */
  async findOrCreateOAuthUser(
    profile: OAuthProfile,
    tenantId?: string,
  ): Promise<AuthResponse> {
    // 1. Try to find user by OAuth provider + provider ID
    const existingByOAuth = await this.prisma.user.findUnique({
      where: {
        oauthProvider_oauthProviderId: {
          oauthProvider: profile.provider,
          oauthProviderId: profile.providerId,
        },
      },
    });

    if (existingByOAuth) {
      if (!existingByOAuth.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }
      return this.buildAuthResponse(existingByOAuth);
    }

    // 2. Try to find user by email
    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingByEmail) {
      if (!existingByEmail.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Link OAuth to existing account
      await this.linkOAuthAccount(
        existingByEmail.id,
        profile.provider,
        profile.providerId,
        profile.raw,
      );

      return this.buildAuthResponse(existingByEmail);
    }

    // 3. Auto-provision: determine tenant
    const resolvedTenantId = tenantId ?? (await this.resolveTenantFromEmail(profile.email));

    if (!resolvedTenantId) {
      throw new ForbiddenException(
        'No tenant found for this email domain. Contact your administrator.',
      );
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: resolvedTenantId },
    });

    if (!tenant || !tenant.isActive) {
      throw new ForbiddenException('Tenant not found or inactive');
    }

    if (!tenant.ssoAutoProvision) {
      throw new ForbiddenException(
        'Auto-provisioning is disabled for this organization. Contact your administrator.',
      );
    }

    // Create user with a random non-usable password hash
    const randomPasswordHash = crypto.randomBytes(64).toString('hex');

    const newUser = await this.prisma.user.create({
      data: {
        email: profile.email,
        passwordHash: randomPasswordHash,
        name: profile.name,
        cpf: '',
        role: UserRole.DOCTOR, // Default role for SSO provisioned users
        tenantId: resolvedTenantId,
        avatar: profile.avatar ?? null,
        oauthProvider: profile.provider,
        oauthProviderId: profile.providerId,
        oauthProfileData: profile.raw as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `Auto-provisioned OAuth user: ${newUser.id} (${profile.provider}) for tenant: ${resolvedTenantId}`,
    );

    return this.buildAuthResponse(newUser);
  }

  /**
   * Link an OAuth account to an existing user
   */
  async linkOAuthAccount(
    userId: string,
    provider: string,
    providerId: string,
    profileData: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        oauthProvider: provider,
        oauthProviderId: providerId,
        oauthProfileData: profileData as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Linked OAuth (${provider}) to user: ${userId}`);
  }

  /**
   * Remove OAuth link from a user
   */
  async unlinkOAuthAccount(userId: string, _provider: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        oauthProvider: null,
        oauthProviderId: null,
        oauthProfileData: Prisma.JsonNull,
      },
    });

    this.logger.log(`Unlinked OAuth from user: ${userId}`);
  }

  /**
   * Get SSO configuration for a tenant
   */
  async getTenantSSOConfig(tenantId: string): Promise<{
    ssoEnabled: boolean;
    ssoProvider: string | null;
    ssoDomain: string | null;
    ssoAutoProvision: boolean;
    ssoConfig: Record<string, unknown> | null;
  }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        ssoEnabled: true,
        ssoProvider: true,
        ssoDomain: true,
        ssoAutoProvision: true,
        ssoConfig: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return {
      ssoEnabled: tenant.ssoEnabled,
      ssoProvider: tenant.ssoProvider,
      ssoDomain: tenant.ssoDomain,
      ssoAutoProvision: tenant.ssoAutoProvision,
      ssoConfig: (tenant.ssoConfig as Record<string, unknown>) ?? null,
    };
  }

  /**
   * Configure SSO for a tenant (admin only)
   */
  async configureTenantSSO(
    tenantId: string,
    config: SSOConfigInput,
  ): Promise<{ message: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (config.ssoEnabled && !config.ssoProvider) {
      throw new BadRequestException(
        'SSO provider is required when enabling SSO',
      );
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ssoEnabled: config.ssoEnabled,
        ssoProvider: config.ssoProvider ?? null,
        ssoConfig: (config.ssoConfig as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        ssoDomain: config.ssoDomain ?? null,
        ssoAutoProvision: config.ssoAutoProvision ?? false,
      },
    });

    this.logger.log(
      `SSO configured for tenant ${tenantId}: provider=${config.ssoProvider ?? 'none'}, enabled=${String(config.ssoEnabled)}`,
    );

    return { message: 'SSO configuration updated successfully' };
  }

  /**
   * Detect if an email domain has SSO configured
   */
  async detectSSOFromEmail(email: string): Promise<SSODetectResult> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      return { ssoEnabled: false, provider: null, tenantId: null, tenantName: null };
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: {
        ssoDomain: domain,
        ssoEnabled: true,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        ssoProvider: true,
        ssoEnabled: true,
      },
    });

    if (!tenant) {
      return { ssoEnabled: false, provider: null, tenantId: null, tenantName: null };
    }

    return {
      ssoEnabled: tenant.ssoEnabled,
      provider: tenant.ssoProvider,
      tenantId: tenant.id,
      tenantName: tenant.name,
    };
  }

  /**
   * Validate an OAuth token and exchange for a VoxPEP JWT
   * Used by the SPA flow where the frontend receives the OAuth code
   */
  async validateSSOToken(
    provider: string,
    token: string,
  ): Promise<AuthResponse> {
    // Verify the short-lived SSO exchange token we issued
    let payload: {
      sub: string;
      email: string;
      role: string;
      tenantId: string;
      ssoExchange?: boolean;
    };

    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired SSO token');
    }

    if (!payload.ssoExchange) {
      throw new UnauthorizedException('Invalid SSO exchange token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (provider !== user.oauthProvider) {
      throw new UnauthorizedException('Provider mismatch');
    }

    return this.buildAuthResponse(user);
  }

  /**
   * Generate a short-lived SSO exchange token for the callback redirect
   */
  async generateSSOExchangeToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const token = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        ssoExchange: true,
      },
      {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: 300, // 5 minutes
      },
    );

    return token;
  }

  // ===== Private Helpers =====

  private async resolveTenantFromEmail(email: string): Promise<string | null> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;

    const tenant = await this.prisma.tenant.findFirst({
      where: {
        ssoDomain: domain,
        ssoEnabled: true,
        isActive: true,
      },
      select: { id: true },
    });

    return tenant?.id ?? null;
  }

  private async buildAuthResponse(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  }): Promise<AuthResponse> {
    const accessExpiresIn = this.configService.get<number>('jwt.accessExpiration', 900);
    const refreshExpiresIn = this.configService.get<number>('jwt.refreshExpiration', 604800);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

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

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }
}
