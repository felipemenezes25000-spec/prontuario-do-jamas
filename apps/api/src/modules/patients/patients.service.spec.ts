import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PatientsService', () => {
  let service: PatientsService;

  const tenantId = 'tenant-1';

  const mockPatient = {
    id: 'patient-1',
    fullName: 'Maria Silva',
    cpf: '12345678900',
    mrn: 'MRN-0001',
    birthDate: new Date('1985-03-15'),
    gender: 'FEMALE',
    phone: '11999999999',
    insuranceProvider: 'SUS',
    tenantId,
    createdAt: new Date(),
    deletedAt: null,
    allergies: [],
    chronicConditions: [],
    encounters: [],
    vitalSigns: [],
  };

  const mockPrismaService = {
    patient: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      name: 'Maria Silva',
      cpf: '12345678900',
      dateOfBirth: '1985-03-15',
      gender: 'FEMALE',
    };

    it('should create and return a patient', async () => {
      mockPrismaService.patient.findFirst.mockResolvedValue(null);
      mockPrismaService.patient.create.mockResolvedValue(mockPatient);

      const result = await service.create(tenantId, createDto as any);

      expect(result).toEqual(mockPatient);
      expect(mockPrismaService.patient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          fullName: 'Maria Silva',
          cpf: '12345678900',
          birthDate: expect.any(Date),
        }),
      });
    });

    it('should throw ConflictException on duplicate CPF in same tenant', async () => {
      mockPrismaService.patient.findFirst.mockResolvedValue(mockPatient);

      await expect(service.create(tenantId, createDto as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated results filtered by tenant', async () => {
      const patients = [mockPatient];
      mockPrismaService.patient.findMany.mockResolvedValue(patients);
      mockPrismaService.patient.count.mockResolvedValue(1);

      const query = { page: 1, pageSize: 10, skip: 0, take: 10 } as any;
      const result = await service.findAll(tenantId, query);

      expect(result.data).toEqual(patients);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockPrismaService.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
    });

    it('should filter by name when provided', async () => {
      mockPrismaService.patient.findMany.mockResolvedValue([]);
      mockPrismaService.patient.count.mockResolvedValue(0);

      const query = {
        page: 1,
        pageSize: 10,
        skip: 0,
        take: 10,
        name: 'Maria',
      } as any;
      await service.findAll(tenantId, query);

      expect(mockPrismaService.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            fullName: { contains: 'Maria', mode: 'insensitive' },
          }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return patient with relations', async () => {
      mockPrismaService.patient.findFirst.mockResolvedValue(mockPatient);

      const result = await service.findById('patient-1', tenantId);

      expect(result).toEqual(mockPatient);
      expect(mockPrismaService.patient.findFirst).toHaveBeenCalledWith({
        where: { id: 'patient-1', tenantId },
        include: expect.objectContaining({
          allergies: true,
          chronicConditions: true,
        }),
      });
    });

    it('should throw NotFoundException for non-existent ID', async () => {
      mockPrismaService.patient.findFirst.mockResolvedValue(null);

      await expect(service.findById('nonexistent', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update patient fields', async () => {
      mockPrismaService.patient.findFirst.mockResolvedValue(mockPatient);
      mockPrismaService.patient.update.mockResolvedValue({
        ...mockPatient,
        phone: '11888888888',
      });

      const result = await service.update('patient-1', tenantId, {
        phone: '11888888888',
      } as any);

      expect(result.phone).toBe('11888888888');
      expect(mockPrismaService.patient.update).toHaveBeenCalledWith({
        where: { id: 'patient-1' },
        data: { phone: '11888888888' },
      });
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt on the patient', async () => {
      mockPrismaService.patient.findFirst.mockResolvedValue(mockPatient);
      mockPrismaService.patient.update.mockResolvedValue({
        ...mockPatient,
        deletedAt: new Date(),
      });

      const result = await service.softDelete('patient-1', tenantId);

      expect(result.deletedAt).toBeInstanceOf(Date);
      expect(mockPrismaService.patient.update).toHaveBeenCalledWith({
        where: { id: 'patient-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
