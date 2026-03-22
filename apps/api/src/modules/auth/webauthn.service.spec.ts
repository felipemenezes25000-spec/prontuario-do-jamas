import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { WebAuthnService } from './webauthn.service';
import { PrismaService } from '../../prisma/prisma.service';

// Mock @simplewebauthn/server
jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn(),
}));

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const mockGenerateRegistrationOptions = generateRegistrationOptions as jest.MockedFunction<typeof generateRegistrationOptions>;
const mockVerifyRegistrationResponse = verifyRegistrationResponse as jest.MockedFunction<typeof verifyRegistrationResponse>;
const mockGenerateAuthenticationOptions = generateAuthenticationOptions as jest.MockedFunction<typeof generateAuthenticationOptions>;
const mockVerifyAuthenticationResponse = verifyAuthenticationResponse as jest.MockedFunction<typeof verifyAuthenticationResponse>;

describe('WebAuthnService', () => {
  let service: WebAuthnService;

  const mockUser = {
    id: 'user-1',
    email: 'doctor@voxpep.com',
    name: 'Dr. Test',
    role: 'DOCTOR',
    tenantId: 'tenant-1',
    isActive: true,
    settings: null as Record<string, unknown> | null,
  };

  const mockStoredCredential = {
    credentialID: 'cred-abc123',
    credentialPublicKey: Buffer.from('mock-public-key').toString('base64'),
    counter: 0,
    transports: ['internal' as const],
    registeredAt: '2026-01-01T00:00:00.000Z',
    deviceName: 'Dispositivo Multifator',
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        'app.url': 'http://localhost:5173',
        'jwt.secret': 'test-secret',
        'jwt.refreshSecret': 'test-refresh-secret',
        'jwt.accessExpiration': 900,
        'jwt.refreshExpiration': 604800,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebAuthnService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WebAuthnService>(WebAuthnService);
    jest.clearAllMocks();
  });

  describe('generateRegistrationOptions', () => {
    it('should generate registration options for a user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ ...mockUser, settings: null });

      const mockOptions = {
        challenge: 'test-challenge-123',
        rp: { name: 'VoxPEP', id: 'localhost' },
        user: { id: 'user-1', name: 'doctor@voxpep.com', displayName: 'doctor@voxpep.com' },
        pubKeyCredParams: [],
        timeout: 60000,
        attestation: 'none',
      };
      mockGenerateRegistrationOptions.mockResolvedValue(mockOptions as never);

      const result = await service.generateRegistrationOptions(
        'user-1',
        'doctor@voxpep.com',
        'Dr. Test',
      );

      expect(result).toEqual(mockOptions);
      expect(mockGenerateRegistrationOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          rpName: 'VoxPEP',
          rpID: 'localhost',
          userName: 'doctor@voxpep.com',
          userDisplayName: 'Dr. Test',
          attestationType: 'none',
          excludeCredentials: [],
        }),
      );
    });

    it('should exclude existing credentials when user already has some', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        settings: { webauthnCredentials: [mockStoredCredential] },
      });

      const mockOptions = { challenge: 'test-challenge' };
      mockGenerateRegistrationOptions.mockResolvedValue(mockOptions as never);

      await service.generateRegistrationOptions('user-1', 'doctor@voxpep.com', 'Dr. Test');

      expect(mockGenerateRegistrationOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          excludeCredentials: [
            {
              id: 'cred-abc123',
              transports: ['internal'],
            },
          ],
        }),
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.generateRegistrationOptions('nonexistent', 'test@test.com', 'Test'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verifyRegistration', () => {
    it('should verify and store a new credential', async () => {
      // First generate options to store challenge
      mockPrismaService.user.findUnique.mockResolvedValue({ ...mockUser, settings: null });
      const mockOptions = { challenge: 'test-challenge-reg' };
      mockGenerateRegistrationOptions.mockResolvedValue(mockOptions as never);
      await service.generateRegistrationOptions('user-1', 'doctor@voxpep.com', 'Dr. Test');

      // Now verify
      mockPrismaService.user.findUnique.mockResolvedValue({ ...mockUser, settings: null });
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: 'new-cred-id',
            publicKey: new Uint8Array([1, 2, 3]),
            counter: 0,
          },
          credentialDeviceType: 'multiDevice',
          credentialBackedUp: false,
          attestationObject: new Uint8Array(),
          userVerified: true,
          origin: 'http://localhost:5173',
          rpID: 'localhost',
        },
      } as never);

      const mockCredential = {
        id: 'new-cred-id',
        rawId: 'raw-id',
        type: 'public-key',
        response: {
          clientDataJSON: 'mock',
          attestationObject: 'mock',
          transports: ['internal'],
        },
        clientExtensionResults: {},
        authenticatorAttachment: 'platform',
      };

      const result = await service.verifyRegistration('user-1', mockCredential as never);

      expect(result.verified).toBe(true);
      expect(result.credentialID).toBe('new-cred-id');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            settings: expect.objectContaining({
              webauthnCredentials: expect.arrayContaining([
                expect.objectContaining({
                  credentialID: 'new-cred-id',
                }),
              ]),
            }),
          }),
        }),
      );
    });

    it('should throw BadRequestException if challenge not found', async () => {
      const mockCredential = { id: 'cred', response: {} };

      await expect(
        service.verifyRegistration('user-1', mockCredential as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if verification fails', async () => {
      // Store a challenge first
      mockPrismaService.user.findUnique.mockResolvedValue({ ...mockUser, settings: null });
      mockGenerateRegistrationOptions.mockResolvedValue({ challenge: 'ch' } as never);
      await service.generateRegistrationOptions('user-1', 'a@b.com', 'A');

      mockVerifyRegistrationResponse.mockResolvedValue({
        verified: false,
        registrationInfo: undefined,
      } as never);

      await expect(
        service.verifyRegistration('user-1', { id: 'x', response: {} } as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateAuthenticationOptions', () => {
    it('should generate authentication options for user with credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        settings: { webauthnCredentials: [mockStoredCredential] },
      });

      const mockOptions = { challenge: 'auth-challenge', allowCredentials: [] };
      mockGenerateAuthenticationOptions.mockResolvedValue(mockOptions as never);

      const result = await service.generateAuthenticationOptions('doctor@voxpep.com');

      expect(result).toEqual(mockOptions);
      expect(mockGenerateAuthenticationOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          rpID: 'localhost',
          allowCredentials: [
            {
              id: 'cred-abc123',
              transports: ['internal'],
            },
          ],
          userVerification: 'preferred',
        }),
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.generateAuthenticationOptions('nobody@voxpep.com'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
        settings: { webauthnCredentials: [mockStoredCredential] },
      });

      await expect(
        service.generateAuthenticationOptions('doctor@voxpep.com'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if no credentials registered', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        settings: { webauthnCredentials: [] },
      });

      await expect(
        service.generateAuthenticationOptions('doctor@voxpep.com'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyAuthentication', () => {
    it('should verify authentication and return JWT tokens', async () => {
      // Generate auth options first to store challenge
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        settings: { webauthnCredentials: [mockStoredCredential] },
      });
      mockGenerateAuthenticationOptions.mockResolvedValue({ challenge: 'auth-ch' } as never);
      await service.generateAuthenticationOptions('doctor@voxpep.com');

      // Now verify
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        settings: { webauthnCredentials: [mockStoredCredential] },
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      mockVerifyAuthenticationResponse.mockResolvedValue({
        verified: true,
        authenticationInfo: {
          newCounter: 1,
          credentialID: 'cred-abc123',
          userVerified: true,
          credentialDeviceType: 'multiDevice',
          credentialBackedUp: false,
          origin: 'http://localhost:5173',
          rpID: 'localhost',
        },
      } as never);

      const mockCredential = {
        id: 'cred-abc123',
        rawId: 'raw-id',
        type: 'public-key',
        response: {
          clientDataJSON: 'mock',
          authenticatorData: 'mock',
          signature: 'mock',
        },
        clientExtensionResults: {},
      };

      const result = await service.verifyAuthentication('doctor@voxpep.com', mockCredential as never);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('doctor@voxpep.com');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            lastLoginAt: expect.any(Date),
            loginCount: { increment: 1 },
          }),
        }),
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyAuthentication('nobody@voxpep.com', {} as never),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if credential not recognized', async () => {
      // Store challenge first
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        settings: { webauthnCredentials: [mockStoredCredential] },
      });
      mockGenerateAuthenticationOptions.mockResolvedValue({ challenge: 'ch' } as never);
      await service.generateAuthenticationOptions('doctor@voxpep.com');

      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        settings: { webauthnCredentials: [mockStoredCredential] },
      });

      const unknownCredential = { id: 'unknown-cred', response: {} };

      await expect(
        service.verifyAuthentication('doctor@voxpep.com', unknownCredential as never),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if verification fails', async () => {
      // Store challenge
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        settings: { webauthnCredentials: [mockStoredCredential] },
      });
      mockGenerateAuthenticationOptions.mockResolvedValue({ challenge: 'ch2' } as never);
      await service.generateAuthenticationOptions('doctor@voxpep.com');

      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        settings: { webauthnCredentials: [mockStoredCredential] },
      });

      mockVerifyAuthenticationResponse.mockResolvedValue({
        verified: false,
        authenticationInfo: { newCounter: 0 },
      } as never);

      const credential = { id: 'cred-abc123', response: {} };

      await expect(
        service.verifyAuthentication('doctor@voxpep.com', credential as never),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getCredentials', () => {
    it('should return list of credentials without sensitive data', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        settings: { webauthnCredentials: [mockStoredCredential] },
      });

      const result = await service.getCredentials('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        credentialID: 'cred-abc123',
        registeredAt: '2026-01-01T00:00:00.000Z',
        deviceName: 'Dispositivo Multifator',
      });
      // Ensure no public key is leaked
      expect(result[0]).not.toHaveProperty('credentialPublicKey');
    });

    it('should return empty array when no credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ ...mockUser, settings: null });

      const result = await service.getCredentials('user-1');

      expect(result).toHaveLength(0);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCredentials('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('removeCredential', () => {
    it('should remove an existing credential', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        settings: { webauthnCredentials: [mockStoredCredential] },
      });
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.removeCredential('user-1', 'cred-abc123');

      expect(result.message).toBe('Credential removed successfully');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            settings: expect.objectContaining({
              webauthnCredentials: [],
            }),
          }),
        }),
      );
    });

    it('should throw NotFoundException if credential not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        settings: { webauthnCredentials: [mockStoredCredential] },
      });

      await expect(
        service.removeCredential('user-1', 'nonexistent-cred'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.removeCredential('nonexistent', 'cred-abc123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
