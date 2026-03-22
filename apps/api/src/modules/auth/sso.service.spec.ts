import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SsoService, OAuthProfile } from './sso.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SsoService', () => {
  let service: SsoService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    tenant: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let jwtService: { signAsync: jest.Mock; verify: jest.Mock };

  const mockProfile: OAuthProfile = {
    provider: 'google',
    providerId: 'google-123',
    email: 'doctor@hospital.com.br',
    name: 'Dr. Test',
    avatar: 'https://example.com/avatar.jpg',
    raw: { sub: 'google-123' },
  };

  const mockUser = {
    id: 'user-1',
    email: 'doctor@hospital.com.br',
    name: 'Dr. Test',
    role: 'DOCTOR',
    tenantId: 'tenant-1',
    isActive: true,
    oauthProvider: 'google',
    oauthProviderId: 'google-123',
    passwordHash: 'hash',
    cpf: '',
    loginCount: 5,
  };

  const mockTenant = {
    id: 'tenant-1',
    name: 'Hospital Test',
    isActive: true,
    ssoEnabled: true,
    ssoProvider: 'google',
    ssoDomain: 'hospital.com.br',
    ssoAutoProvision: true,
    ssoConfig: { clientId: 'test' },
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SsoService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const config: Record<string, unknown> = {
                'jwt.secret': 'test-secret',
                'jwt.refreshSecret': 'test-refresh-secret',
                'jwt.accessExpiration': 900,
                'jwt.refreshExpiration': 604800,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SsoService>(SsoService);
  });

  describe('findOrCreateOAuthUser', () => {
    it('should find existing user by OAuth provider + ID', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);
      prisma.user.update.mockResolvedValueOnce(mockUser);

      const result = await service.findOrCreateOAuthUser(mockProfile);

      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('doctor@hospital.com.br');
      expect(result.accessToken).toBe('mock-token');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          oauthProvider_oauthProviderId: {
            oauthProvider: 'google',
            oauthProviderId: 'google-123',
          },
        },
      });
    });

    it('should find existing user by email and link OAuth', async () => {
      // Not found by OAuth ID
      prisma.user.findUnique.mockResolvedValueOnce(null);
      // Found by email
      prisma.user.findUnique.mockResolvedValueOnce(mockUser);
      // Link update
      prisma.user.update.mockResolvedValueOnce(mockUser);
      // Last login update
      prisma.user.update.mockResolvedValueOnce(mockUser);

      const result = await service.findOrCreateOAuthUser(mockProfile);

      expect(result.user.email).toBe('doctor@hospital.com.br');
      // Should have called update to link OAuth
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            oauthProvider: 'google',
            oauthProviderId: 'google-123',
          }),
        }),
      );
    });

    it('should auto-provision new user when tenant allows it', async () => {
      // Not found by OAuth ID
      prisma.user.findUnique.mockResolvedValueOnce(null);
      // Not found by email
      prisma.user.findUnique.mockResolvedValueOnce(null);
      // Tenant lookup by domain
      prisma.tenant.findFirst.mockResolvedValueOnce({ id: 'tenant-1' });
      // Tenant details
      prisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      // User creation
      prisma.user.create.mockResolvedValueOnce({
        ...mockUser,
        id: 'new-user-1',
      });
      // Last login update
      prisma.user.update.mockResolvedValueOnce({
        ...mockUser,
        id: 'new-user-1',
      });

      const result = await service.findOrCreateOAuthUser(mockProfile);

      expect(result.user.id).toBe('new-user-1');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'doctor@hospital.com.br',
            name: 'Dr. Test',
            oauthProvider: 'google',
            oauthProviderId: 'google-123',
            tenantId: 'tenant-1',
          }),
        }),
      );
    });

    it('should reject when auto-provision is disabled', async () => {
      // Not found by OAuth ID
      prisma.user.findUnique.mockResolvedValueOnce(null);
      // Not found by email
      prisma.user.findUnique.mockResolvedValueOnce(null);
      // Tenant lookup by domain
      prisma.tenant.findFirst.mockResolvedValueOnce({ id: 'tenant-1' });
      // Tenant with auto-provision disabled
      prisma.tenant.findUnique.mockResolvedValueOnce({
        ...mockTenant,
        ssoAutoProvision: false,
      });

      await expect(
        service.findOrCreateOAuthUser(mockProfile),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject when user account is deactivated', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        isActive: false,
      });

      await expect(
        service.findOrCreateOAuthUser(mockProfile),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('linkOAuthAccount', () => {
    it('should link OAuth account to existing user', async () => {
      prisma.user.update.mockResolvedValueOnce(mockUser);

      await service.linkOAuthAccount(
        'user-1',
        'google',
        'google-123',
        { sub: 'google-123' },
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          oauthProvider: 'google',
          oauthProviderId: 'google-123',
          oauthProfileData: { sub: 'google-123' },
        },
      });
    });
  });

  describe('detectSSOFromEmail', () => {
    it('should return SSO config when domain matches', async () => {
      prisma.tenant.findFirst.mockResolvedValueOnce({
        id: 'tenant-1',
        name: 'Hospital Test',
        ssoProvider: 'google',
        ssoEnabled: true,
      });

      const result = await service.detectSSOFromEmail(
        'doctor@hospital.com.br',
      );

      expect(result.ssoEnabled).toBe(true);
      expect(result.provider).toBe('google');
      expect(result.tenantName).toBe('Hospital Test');
    });

    it('should return not enabled when no domain match', async () => {
      prisma.tenant.findFirst.mockResolvedValueOnce(null);

      const result = await service.detectSSOFromEmail(
        'user@unknown-domain.com',
      );

      expect(result.ssoEnabled).toBe(false);
      expect(result.provider).toBeNull();
    });

    it('should handle invalid email gracefully', async () => {
      const result = await service.detectSSOFromEmail('invalid-email');

      expect(result.ssoEnabled).toBe(false);
    });
  });

  describe('configureTenantSSO', () => {
    it('should save SSO configuration for tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);
      prisma.tenant.update.mockResolvedValueOnce(mockTenant);

      const result = await service.configureTenantSSO('tenant-1', {
        ssoEnabled: true,
        ssoProvider: 'google',
        ssoDomain: 'hospital.com.br',
        ssoAutoProvision: true,
        ssoConfig: { clientId: 'new-id' },
      });

      expect(result.message).toBe('SSO configuration updated successfully');
      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant-1' },
          data: expect.objectContaining({
            ssoEnabled: true,
            ssoProvider: 'google',
            ssoDomain: 'hospital.com.br',
            ssoAutoProvision: true,
          }),
        }),
      );
    });

    it('should throw when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.configureTenantSSO('nonexistent', {
          ssoEnabled: true,
          ssoProvider: 'google',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should require provider when enabling SSO', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce(mockTenant);

      await expect(
        service.configureTenantSSO('tenant-1', {
          ssoEnabled: true,
        }),
      ).rejects.toThrow('SSO provider is required when enabling SSO');
    });
  });

  describe('getTenantSSOConfig', () => {
    it('should return SSO config for tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce({
        ssoEnabled: true,
        ssoProvider: 'google',
        ssoDomain: 'hospital.com.br',
        ssoAutoProvision: true,
        ssoConfig: { clientId: 'test-id' },
      });

      const result = await service.getTenantSSOConfig('tenant-1');

      expect(result.ssoEnabled).toBe(true);
      expect(result.ssoProvider).toBe('google');
      expect(result.ssoDomain).toBe('hospital.com.br');
    });

    it('should throw when tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.getTenantSSOConfig('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
