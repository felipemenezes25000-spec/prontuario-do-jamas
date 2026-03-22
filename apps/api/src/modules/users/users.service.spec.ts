import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  const mockUser = {
    id: 'user-1',
    email: 'doctor@hospital.com',
    name: 'Dr. Silva',
    passwordHash: 'hashed-password',
    cpf: '12345678900',
    role: 'DOCTOR',
    isActive: true,
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    doctorProfile: null,
    nurseProfile: null,
  };

  const mockPrisma = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      email: 'doctor@hospital.com',
      password: 'SecurePass123',
      name: 'Dr. Silva',
      role: 'DOCTOR',
      tenantId: 'tenant-1',
    };

    it('should create user with hashed password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await service.create(createDto as any);

      expect(result).not.toHaveProperty('passwordHash');
      expect(bcrypt.hash).toHaveBeenCalledWith('SecurePass123', 12);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          passwordHash: 'hashed-password',
          role: 'DOCTOR',
        }),
      });
    });

    it('should throw ConflictException on duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.create(createDto as any)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated users filtered by tenant', async () => {
      const users = [
        {
          id: 'user-1',
          email: 'doctor@hospital.com',
          name: 'Dr. Silva',
          role: 'DOCTOR',
          isActive: true,
          createdAt: new Date(),
          lastLoginAt: null,
          doctorProfile: null,
          nurseProfile: null,
        },
      ];
      prisma.user.findMany.mockResolvedValue(users);
      prisma.user.count.mockResolvedValue(1);

      const pagination = { page: 1, pageSize: 10, skip: 0, take: 10 } as any;
      const result = await service.findAll('tenant-1', pagination);

      expect(result.data).toEqual(users);
      expect(result.total).toBe(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return user with profile', async () => {
      const userWithoutHash = { ...mockUser };
      delete (userWithoutHash as any).passwordHash;
      prisma.user.findUnique.mockResolvedValue(userWithoutHash);

      const result = await service.findById('user-1');

      expect(result).toEqual(userWithoutHash);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: expect.objectContaining({
          id: true,
          email: true,
          name: true,
          doctorProfile: true,
          nurseProfile: true,
        }),
      });
    });

    it('should throw NotFoundException for non-existent ID', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const userSelect = {
        id: 'user-1',
        email: 'doctor@hospital.com',
        name: 'Dr. Silva Updated',
        role: 'DOCTOR',
        isActive: true,
        tenantId: 'tenant-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        doctorProfile: null,
        nurseProfile: null,
      };
      prisma.user.findUnique.mockResolvedValue(userSelect);
      prisma.user.update.mockResolvedValue({
        ...userSelect,
        name: 'Dr. Silva Updated',
      });

      const result = await service.update('user-1', {
        name: 'Dr. Silva Updated',
      } as any);

      expect(result.name).toBe('Dr. Silva Updated');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
        }),
      );
    });
  });

  describe('deactivate', () => {
    it('should set isActive to false', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ id: 'user-1', isActive: false });

      const result = await service.deactivate('user-1');

      expect(result.isActive).toBe(false);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { isActive: false },
        select: { id: true, isActive: true },
      });
    });
  });

  describe('changePassword', () => {
    it('should hash and update new password', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue(mockUser);

      const result = await service.changePassword(
        'user-1',
        'oldPassword',
        'newPassword',
      );

      expect(result.message).toBe('Password changed successfully');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'oldPassword',
        'hashed-password',
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 12);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: 'hashed-password' },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', 'old', 'new'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if current password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', 'wrongPassword', 'newPassword'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
