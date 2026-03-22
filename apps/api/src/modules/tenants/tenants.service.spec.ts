import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TenantsService', () => {
  let service: TenantsService;
  let prisma: any;

  const mockTenant = {
    id: 'tenant-1',
    name: 'Hospital Central',
    slug: 'hospital-central',
    cnpj: '12345678000100',
    settings: {},
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockPrisma = {
    tenant: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: 'Hospital Central',
      slug: 'hospital-central',
      cnpj: '12345678000100',
    };

    it('should create tenant with valid data', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.tenant.create.mockResolvedValue(mockTenant);

      const result = await service.create(createDto as any);

      expect(result).toEqual(mockTenant);
      expect(prisma.tenant.create).toHaveBeenCalledWith({ data: createDto });
    });

    it('should throw ConflictException on duplicate slug', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      await expect(service.create(createDto as any)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.tenant.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return tenants ordered by name', async () => {
      const tenants = [mockTenant];
      prisma.tenant.findMany.mockResolvedValue(tenants);

      const result = await service.findAll();

      expect(result).toEqual(tenants);
      expect(prisma.tenant.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
        include: { _count: { select: { users: true } } },
      });
    });
  });

  describe('findById', () => {
    it('should return tenant with counts', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.findById('tenant-1');

      expect(result).toEqual(mockTenant);
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        include: { _count: { select: { users: true, patients: true } } },
      });
    });

    it('should throw NotFoundException for non-existent ID', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update tenant settings', async () => {
      const updateDto = { name: 'Hospital Updated' };
      const updated = { ...mockTenant, name: 'Hospital Updated' };
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.tenant.update.mockResolvedValue(updated);

      const result = await service.update('tenant-1', updateDto as any);

      expect(result).toEqual(updated);
      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: updateDto,
      });
    });
  });

  describe('delete', () => {
    it('should delete tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.tenant.delete.mockResolvedValue(mockTenant);

      const result = await service.delete('tenant-1');

      expect(result).toEqual(mockTenant);
      expect(prisma.tenant.delete).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
      });
    });

    it('should throw NotFoundException when deleting non-existent tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
