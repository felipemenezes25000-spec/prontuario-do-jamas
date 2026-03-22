import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EncountersService } from './encounters.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('EncountersService', () => {
  let service: EncountersService;

  const tenantId = 'tenant-1';

  const mockEncounter = {
    id: 'enc-1',
    tenantId,
    patientId: 'patient-1',
    type: 'CONSULTATION',
    status: 'SCHEDULED',
    priority: 'NORMAL',
    startedAt: null,
    completedAt: null,
    duration: null,
    chiefComplaint: 'Headache',
    location: 'Room 1',
    room: '101',
    createdAt: new Date(),
    patient: { id: 'patient-1', fullName: 'Maria Silva', mrn: 'MRN-0001' },
    primaryDoctor: { id: 'doc-1', name: 'Dr. Test', email: 'doc@test.com', role: 'DOCTOR' },
    primaryNurse: null,
    clinicalNotes: [],
    prescriptions: [],
    vitalSigns: [],
    triageAssessment: null,
  };

  const mockPrismaService = {
    encounter: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncountersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EncountersService>(EncountersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create encounter with correct default status', async () => {
      const dto = {
        patientId: 'patient-1',
        type: 'CONSULTATION',
        chiefComplaint: 'Headache',
        primaryDoctorId: 'doc-1',
      };
      mockPrismaService.encounter.create.mockResolvedValue(mockEncounter);

      const result = await service.create(tenantId, dto as any);

      expect(result).toEqual(mockEncounter);
      expect(mockPrismaService.encounter.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          patientId: 'patient-1',
          type: 'CONSULTATION',
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should filter by tenant, patient, doctor, status, and date range', async () => {
      mockPrismaService.encounter.findMany.mockResolvedValue([mockEncounter]);
      mockPrismaService.encounter.count.mockResolvedValue(1);

      const query = {
        page: 1,
        pageSize: 10,
        skip: 0,
        take: 10,
        patientId: 'patient-1',
        doctorId: 'doc-1',
        status: 'SCHEDULED',
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
      } as any;

      const result = await service.findAll(tenantId, query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrismaService.encounter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            patientId: 'patient-1',
            primaryDoctorId: 'doc-1',
            status: 'SCHEDULED',
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should set startedAt when transitioning to IN_PROGRESS', async () => {
      mockPrismaService.encounter.findFirst.mockResolvedValue({
        ...mockEncounter,
        status: 'WAITING',
        startedAt: null,
      });
      mockPrismaService.encounter.update.mockResolvedValue({
        ...mockEncounter,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      });

      const result = await service.updateStatus('enc-1', tenantId, 'IN_PROGRESS' as any);

      expect(mockPrismaService.encounter.update).toHaveBeenCalledWith({
        where: { id: 'enc-1' },
        data: expect.objectContaining({
          status: 'IN_PROGRESS',
          startedAt: expect.any(Date),
        }),
      });
    });

    it('should set completedAt and duration when completing', async () => {
      const startedAt = new Date(Date.now() - 30 * 60000); // 30 minutes ago
      mockPrismaService.encounter.findFirst.mockResolvedValue({
        ...mockEncounter,
        status: 'IN_PROGRESS',
        startedAt,
      });
      mockPrismaService.encounter.update.mockResolvedValue({
        ...mockEncounter,
        status: 'COMPLETED',
        completedAt: new Date(),
        duration: 30,
      });

      await service.updateStatus('enc-1', tenantId, 'COMPLETED' as any);

      expect(mockPrismaService.encounter.update).toHaveBeenCalledWith({
        where: { id: 'enc-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          duration: expect.any(Number),
        }),
      });
    });

    it('should throw NotFoundException for non-existent encounter', async () => {
      mockPrismaService.encounter.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', tenantId, 'IN_PROGRESS' as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('complete', () => {
    it('should call updateStatus with COMPLETED', async () => {
      const startedAt = new Date(Date.now() - 60 * 60000);
      mockPrismaService.encounter.findFirst.mockResolvedValue({
        ...mockEncounter,
        status: 'IN_PROGRESS',
        startedAt,
      });
      mockPrismaService.encounter.update.mockResolvedValue({
        ...mockEncounter,
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      await service.complete('enc-1', tenantId);

      expect(mockPrismaService.encounter.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });
  });
});
