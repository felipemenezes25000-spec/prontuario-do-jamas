import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { generateSecret, generateSync } from 'otplib';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

// Mock user data
const mockUserId = 'user-123';
const mockUser = {
  id: mockUserId,
  email: 'doctor@hospital.com',
  name: 'Dr. Test',
  role: 'DOCTOR',
  tenantId: 'tenant-1',
  isActive: true,
  passwordHash: '$2a$12$test',
  mfaEnabled: false,
  mfaSecret: null as string | null,
  mfaBackupCodes: [] as string[],
  lastLoginAt: null,
  loginCount: 0,
};

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  tenant: {
    findUnique: jest.fn(),
  },
};

// Mock JwtService
const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock-token'),
  verify: jest.fn(),
};

// Mock ConfigService
const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: number | string) => {
    const config: Record<string, string | number> = {
      'jwt.secret': 'test-secret',
      'jwt.refreshSecret': 'test-refresh-secret',
      'jwt.accessExpiration': 900,
      'jwt.refreshExpiration': 604800,
    };
    return config[key] ?? defaultValue;
  }),
};

describe('AuthService — MFA', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('generateMfaSecret', () => {
    it('should generate MFA secret, QR code and backup codes', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: mockUser.email,
        mfaEnabled: false,
      });
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.generateMfaSecret(mockUserId);

      expect(result).toHaveProperty('qrCodeDataUrl');
      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('backupCodes');
      expect(result.qrCodeDataUrl).toContain('data:image/png;base64,');
      expect(result.secret).toBeTruthy();
      expect(result.backupCodes).toHaveLength(10);
      result.backupCodes.forEach((code) => {
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[A-Z2-9]+$/);
      });

      // Verify user was updated with secret and hashed backup codes
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          mfaSecret: expect.any(String),
          mfaBackupCodes: expect.any(Array),
        }),
      });
    });

    it('should throw if MFA is already enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: mockUser.email,
        mfaEnabled: true,
      });

      await expect(service.generateMfaSecret(mockUserId)).rejects.toThrow(BadRequestException);
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.generateMfaSecret(mockUserId)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyMfaSetup', () => {
    it('should enable MFA when valid code is provided', async () => {
      const secret = generateSecret();
      const validCode = generateSync({ secret });

      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: secret,
        mfaEnabled: false,
      });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, mfaEnabled: true });

      const result = await service.verifyMfaSetup(mockUserId, validCode);

      expect(result).toEqual({ message: 'MFA enabled successfully' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { mfaEnabled: true },
      });
    });

    it('should throw on invalid TOTP code', async () => {
      const secret = generateSecret();

      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: secret,
        mfaEnabled: false,
      });

      await expect(service.verifyMfaSetup(mockUserId, '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if MFA already enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: 'some-secret',
        mfaEnabled: true,
      });

      await expect(service.verifyMfaSetup(mockUserId, '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if setup not initiated (no secret)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: null,
        mfaEnabled: false,
      });

      await expect(service.verifyMfaSetup(mockUserId, '123456')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateMfaCode', () => {
    it('should return tokens on valid TOTP code', async () => {
      const secret = generateSecret();
      const validCode = generateSync({ secret });

      mockJwtService.verify.mockReturnValue({
        sub: mockUserId,
        email: mockUser.email,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        mfaPending: true,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: secret,
      });
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.validateMfaCode('mfa-token-123', validCode);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.id).toBe(mockUserId);
    });

    it('should throw on invalid TOTP code', async () => {
      const secret = generateSecret();

      mockJwtService.verify.mockReturnValue({
        sub: mockUserId,
        email: mockUser.email,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        mfaPending: true,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaSecret: secret,
      });

      await expect(service.validateMfaCode('mfa-token-123', '999999')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw on expired/invalid MFA token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.validateMfaCode('expired-token', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if token is not an MFA token (no mfaPending)', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: mockUserId,
        email: mockUser.email,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        // mfaPending not set
      });

      await expect(service.validateMfaCode('regular-token', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateBackupCode', () => {
    it('should return tokens and consume backup code', async () => {
      const rawCode = 'ABCD1234';
      const hashedCode = await bcrypt.hash(rawCode, 12);

      mockJwtService.verify.mockReturnValue({
        sub: mockUserId,
        email: mockUser.email,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        mfaPending: true,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaBackupCodes: [hashedCode, 'other-hash'],
      });
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.validateBackupCode('mfa-token-123', rawCode);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');

      // Verify the used code was removed
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          mfaBackupCodes: ['other-hash'],
        }),
      });
    });

    it('should throw on invalid backup code', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: mockUserId,
        email: mockUser.email,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
        mfaPending: true,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        mfaBackupCodes: ['$2a$12$somehash'],
      });

      await expect(
        service.validateBackupCode('mfa-token-123', 'WRONGCODE'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('disableMfa', () => {
    it('should disable MFA with valid code', async () => {
      const secret = generateSecret();
      const validCode = generateSync({ secret });

      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: secret,
        mfaEnabled: true,
      });
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.disableMfa(mockUserId, validCode);

      expect(result).toEqual({ message: 'MFA disabled successfully' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: [],
        },
      });
    });

    it('should throw on invalid code', async () => {
      const secret = generateSecret();

      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: secret,
        mfaEnabled: true,
      });

      await expect(service.disableMfa(mockUserId, '000000')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if MFA not enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: null,
        mfaEnabled: false,
      });

      await expect(service.disableMfa(mockUserId, '123456')).rejects.toThrow(BadRequestException);
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should generate new backup codes with valid TOTP', async () => {
      const secret = generateSecret();
      const validCode = generateSync({ secret });

      mockPrisma.user.findUnique.mockResolvedValue({
        mfaSecret: secret,
        mfaEnabled: true,
      });
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.regenerateBackupCodes(mockUserId, validCode);

      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
      result.backupCodes.forEach((code) => {
        expect(code).toHaveLength(8);
      });
    });
  });

  describe('login with MFA', () => {
    it('should return MFA challenge when user has MFA enabled', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);

      // validateUser lookup
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          ...mockUser,
          passwordHash: hashedPassword,
          isActive: true,
        })
        // MFA check lookup
        .mockResolvedValueOnce({
          mfaEnabled: true,
        });

      mockJwtService.signAsync.mockResolvedValue('mfa-temp-token');

      const result = await service.login({ email: mockUser.email, password: 'password123' });

      expect(result).toHaveProperty('requiresMfa', true);
      expect(result).toHaveProperty('mfaToken', 'mfa-temp-token');
      expect(result).not.toHaveProperty('accessToken');
    });

    it('should return full tokens when user has no MFA', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);

      // validateUser lookup
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          ...mockUser,
          passwordHash: hashedPassword,
          isActive: true,
        })
        // MFA check lookup
        .mockResolvedValueOnce({
          mfaEnabled: false,
        });

      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('access-token');

      const result = await service.login({ email: mockUser.email, password: 'password123' });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
      expect(result).not.toHaveProperty('requiresMfa');
    });
  });
});
