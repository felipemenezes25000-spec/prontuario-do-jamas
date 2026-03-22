import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AlertsService', () => {
  let service: AlertsService;
  let prisma: any;

  const mockAlert = {
    id: 'alert-1',
    tenantId: 'tenant-1',
    patientId: 'patient-1',
    encounterId: 'enc-1',
    type: 'VITAL_SIGN_ABNORMAL',
    severity: 'HIGH',
    title: 'High Blood Pressure',
    message: 'BP 180/110',
    isActive: true,
    triggeredAt: new Date(),
    acknowledgedAt: null,
    acknowledgedById: null,
    resolvedAt: null,
    resolvedById: null,
    patient: { id: 'patient-1', fullName: 'Maria Silva', mrn: 'MRN-001' },
    acknowledgedBy: null,
    resolvedBy: null,
  };

  const mockPrisma = {
    clinicalAlert: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an alert', async () => {
      const dto = {
        patientId: 'patient-1',
        encounterId: 'enc-1',
        type: 'VITAL_SIGN_ABNORMAL',
        severity: 'HIGH',
        title: 'High Blood Pressure',
        message: 'BP 180/110',
        source: 'SYSTEM',
      };

      prisma.clinicalAlert.create.mockResolvedValue(mockAlert);

      const result = await service.create('tenant-1', dto as any);

      expect(result).toEqual(mockAlert);
      expect(prisma.clinicalAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          patientId: 'patient-1',
          type: 'VITAL_SIGN_ABNORMAL',
          triggeredAt: expect.any(Date),
        }),
      });
    });
  });

  describe('findActive', () => {
    it('should return only isActive=true alerts', async () => {
      prisma.clinicalAlert.findMany.mockResolvedValue([mockAlert]);

      const result = await service.findActive('tenant-1');

      expect(result).toEqual([mockAlert]);
      expect(prisma.clinicalAlert.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', isActive: true },
        orderBy: [{ severity: 'asc' }, { triggeredAt: 'desc' }],
        include: {
          patient: { select: { id: true, fullName: true, mrn: true } },
        },
      });
    });
  });

  describe('acknowledge', () => {
    it('should set acknowledgedAt and acknowledgedBy', async () => {
      prisma.clinicalAlert.findUnique.mockResolvedValue(mockAlert);
      const acked = {
        ...mockAlert,
        acknowledgedAt: new Date(),
        acknowledgedById: 'user-1',
        actionTaken: 'Administered medication',
      };
      prisma.clinicalAlert.update.mockResolvedValue(acked);

      const result = await service.acknowledge(
        'alert-1',
        'user-1',
        'Administered medication',
      );

      expect(result.acknowledgedById).toBe('user-1');
      expect(prisma.clinicalAlert.update).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: {
          acknowledgedAt: expect.any(Date),
          acknowledgedById: 'user-1',
          actionTaken: 'Administered medication',
        },
      });
    });

    it('should throw NotFoundException for non-existent alert', async () => {
      prisma.clinicalAlert.findUnique.mockResolvedValue(null);

      await expect(
        service.acknowledge('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolve', () => {
    it('should set resolvedAt and isActive=false', async () => {
      prisma.clinicalAlert.findUnique.mockResolvedValue(mockAlert);
      const resolved = {
        ...mockAlert,
        isActive: false,
        resolvedAt: new Date(),
        resolvedById: 'user-1',
      };
      prisma.clinicalAlert.update.mockResolvedValue(resolved);

      const result = await service.resolve('alert-1', 'user-1');

      expect(result.isActive).toBe(false);
      expect(prisma.clinicalAlert.update).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: {
          isActive: false,
          resolvedAt: expect.any(Date),
          resolvedById: 'user-1',
        },
      });
    });
  });
});
