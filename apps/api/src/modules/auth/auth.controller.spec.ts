import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SsoService } from './sso.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockUser: JwtPayload = {
    sub: 'user-1',
    email: 'doctor@voxpep.com',
    role: 'DOCTOR',
    tenantId: 'tenant-1',
  };

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    getProfile: jest.fn(),
    generateMfaSecret: jest.fn(),
    verifyMfaSetup: jest.fn(),
    validateMfaCode: jest.fn(),
    validateBackupCode: jest.fn(),
    disableMfa: jest.fn(),
    regenerateBackupCodes: jest.fn(),
  };

  const mockSsoService = {
    detectSsoForEmail: jest.fn(),
    exchangeToken: jest.fn(),
    configureSso: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: SsoService, useValue: mockSsoService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should call authService.login and return tokens', async () => {
      const dto = { email: 'doctor@voxpep.com', password: 'password123' };
      const expected = { accessToken: 'at', refreshToken: 'rt', user: { id: 'user-1' } };
      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(dto as never);

      expect(service.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });

    it('should propagate errors from service', async () => {
      const dto = { email: 'bad@email.com', password: 'wrong' };
      mockAuthService.login.mockRejectedValue(new Error('Unauthorized'));

      await expect(controller.login(dto as never)).rejects.toThrow('Unauthorized');
    });
  });

  describe('register', () => {
    it('should call authService.register with dto', async () => {
      const dto = { email: 'new@voxpep.com', password: 'pass', name: 'New', role: 'DOCTOR', tenantId: 'tenant-1', cpf: '123' };
      const expected = { accessToken: 'at', refreshToken: 'rt', user: { email: 'new@voxpep.com' } };
      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(dto as never);

      expect(service.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });

    it('should propagate ConflictException from service', async () => {
      const dto = { email: 'dup@voxpep.com', password: 'pass', name: 'Dup', role: 'DOCTOR', tenantId: 'tenant-1', cpf: '123' };
      mockAuthService.register.mockRejectedValue(new Error('Conflict'));

      await expect(controller.register(dto as never)).rejects.toThrow('Conflict');
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh and return new tokens', async () => {
      const dto = { refreshToken: 'valid-rt' };
      const expected = { accessToken: 'new-at', refreshToken: 'new-rt' };
      mockAuthService.refresh.mockResolvedValue(expected);

      const result = await controller.refresh(dto as never);

      expect(service.refresh).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });

    it('should propagate error on invalid refresh token', async () => {
      const dto = { refreshToken: 'expired' };
      mockAuthService.refresh.mockRejectedValue(new Error('Unauthorized'));

      await expect(controller.refresh(dto as never)).rejects.toThrow('Unauthorized');
    });
  });

  describe('logout', () => {
    it('should call authService.logout and return success message', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(mockUser);

      expect(service.logout).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword with email', async () => {
      const dto = { email: 'doctor@voxpep.com' };
      const expected = { message: 'Reset email sent' };
      mockAuthService.forgotPassword.mockResolvedValue(expected);

      const result = await controller.forgotPassword(dto as never);

      expect(service.forgotPassword).toHaveBeenCalledWith('doctor@voxpep.com');
      expect(result).toEqual(expected);
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword with token and newPassword', async () => {
      const dto = { token: 'reset-token', newPassword: 'newPass123' };
      const expected = { message: 'Password reset successfully' };
      mockAuthService.resetPassword.mockResolvedValue(expected);

      const result = await controller.resetPassword(dto as never);

      expect(service.resetPassword).toHaveBeenCalledWith('reset-token', 'newPass123');
      expect(result).toEqual(expected);
    });
  });

  describe('getProfile', () => {
    it('should call authService.getProfile with user id', async () => {
      const expected = { id: 'user-1', email: 'doctor@voxpep.com' };
      mockAuthService.getProfile.mockResolvedValue(expected);

      const result = await controller.getProfile(mockUser);

      expect(service.getProfile).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(expected);
    });
  });

  describe('mfaSetup', () => {
    it('should call authService.generateMfaSecret with user id', async () => {
      const expected = { qrCode: 'data:image/png;base64,...', backupCodes: ['code1'] };
      mockAuthService.generateMfaSecret.mockResolvedValue(expected);

      const result = await controller.mfaSetup(mockUser);

      expect(service.generateMfaSecret).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(expected);
    });
  });

  describe('mfaValidate', () => {
    it('should call authService.validateMfaCode with mfaToken and code', async () => {
      const expected = { accessToken: 'at', refreshToken: 'rt' };
      mockAuthService.validateMfaCode.mockResolvedValue(expected);

      const result = await controller.mfaValidate('mfa-token-123', { code: '123456' } as never);

      expect(service.validateMfaCode).toHaveBeenCalledWith('mfa-token-123', '123456');
      expect(result).toEqual(expected);
    });

    it('should throw when x-mfa-token header is missing', async () => {
      await expect(
        controller.mfaValidate('', { code: '123456' } as never),
      ).rejects.toThrow('x-mfa-token header is required');
    });
  });

  describe('mfaBackup', () => {
    it('should call authService.validateBackupCode', async () => {
      const expected = { accessToken: 'at', refreshToken: 'rt' };
      mockAuthService.validateBackupCode.mockResolvedValue(expected);

      const result = await controller.mfaBackup('mfa-token', { backupCode: 'backup123' } as never);

      expect(service.validateBackupCode).toHaveBeenCalledWith('mfa-token', 'backup123');
      expect(result).toEqual(expected);
    });

    it('should throw when x-mfa-token header is missing', async () => {
      await expect(
        controller.mfaBackup('', { backupCode: 'backup123' } as never),
      ).rejects.toThrow('x-mfa-token header is required');
    });
  });
});
