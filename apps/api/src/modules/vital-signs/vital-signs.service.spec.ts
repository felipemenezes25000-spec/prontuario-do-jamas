import { Test, TestingModule } from '@nestjs/testing';
import { VitalSignsService } from './vital-signs.service';
import { NEWSScoreService } from './news-score.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { PrismaService } from '../../prisma/prisma.service';

describe('VitalSignsService', () => {
  let service: VitalSignsService;

  const mockVitalSigns = {
    id: 'vs-1',
    patientId: 'patient-1',
    encounterId: 'enc-1',
    recordedById: 'nurse-1',
    recordedAt: new Date(),
    systolicBP: 120,
    diastolicBP: 80,
    meanArterialPressure: 93.3,
    heartRate: 72,
    respiratoryRate: 16,
    temperature: 36.5,
    oxygenSaturation: 98,
    weight: 70,
    height: 175,
    bmi: 22.86,
    newsScore: 0,
    newsClassification: 'LOW',
    recordedBy: { id: 'nurse-1', name: 'Nurse Test' },
  };

  const mockPrismaService = {
    vitalSigns: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    patient: {
      findUnique: jest.fn(),
    },
    clinicalAlert: {
      create: jest.fn(),
    },
  };

  const mockRealtimeGateway = {
    emitAlert: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VitalSignsService,
        NEWSScoreService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RealtimeGateway, useValue: mockRealtimeGateway },
      ],
    }).compile();

    service = module.get<VitalSignsService>(VitalSignsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should auto-calculate BMI from weight and height', async () => {
      mockPrismaService.vitalSigns.create.mockResolvedValue(mockVitalSigns);

      await service.create('nurse-1', {
        patientId: 'patient-1',
        encounterId: 'enc-1',
        weight: 70,
        height: 175,
      } as any);

      expect(mockPrismaService.vitalSigns.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          weight: 70,
          height: 175,
          bmi: 22.86, // 70 / (1.75 * 1.75)
        }),
      });
    });

    it('should auto-calculate MAP from blood pressure', async () => {
      mockPrismaService.vitalSigns.create.mockResolvedValue(mockVitalSigns);

      await service.create('nurse-1', {
        patientId: 'patient-1',
        encounterId: 'enc-1',
        systolicBP: 120,
        diastolicBP: 80,
      } as any);

      expect(mockPrismaService.vitalSigns.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          systolicBP: 120,
          diastolicBP: 80,
          meanArterialPressure: 93.3, // (80*2 + 120) / 3
        }),
      });
    });

    it('should auto-calculate GCS total', async () => {
      mockPrismaService.vitalSigns.create.mockResolvedValue(mockVitalSigns);

      await service.create('nurse-1', {
        patientId: 'patient-1',
        encounterId: 'enc-1',
        gcsEye: 4,
        gcsVerbal: 5,
        gcsMotor: 6,
      } as any);

      expect(mockPrismaService.vitalSigns.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          gcs: 15,
          gcsEye: 4,
          gcsVerbal: 5,
          gcsMotor: 6,
        }),
      });
    });

    it('should not calculate BMI when weight or height is missing', async () => {
      mockPrismaService.vitalSigns.create.mockResolvedValue(mockVitalSigns);

      await service.create('nurse-1', {
        patientId: 'patient-1',
        encounterId: 'enc-1',
        weight: 70,
      } as any);

      expect(mockPrismaService.vitalSigns.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          weight: 70,
          bmi: undefined,
        }),
      });
    });

    it('should include NEWS score in created vital signs', async () => {
      mockPrismaService.vitalSigns.create.mockResolvedValue(mockVitalSigns);

      await service.create('nurse-1', {
        patientId: 'patient-1',
        encounterId: 'enc-1',
        systolicBP: 120,
        diastolicBP: 80,
        heartRate: 72,
        respiratoryRate: 16,
        temperature: 36.5,
        oxygenSaturation: 98,
      } as any);

      expect(mockPrismaService.vitalSigns.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          newsScore: 0,
          newsClassification: 'LOW',
        }),
      });
    });

    it('should create alert and emit event when NEWS >= 7', async () => {
      const highNewsVitals = {
        ...mockVitalSigns,
        newsScore: 10,
        newsClassification: 'HIGH',
      };
      mockPrismaService.vitalSigns.create.mockResolvedValue(highNewsVitals);
      mockPrismaService.patient.findUnique.mockResolvedValue({
        tenantId: 'tenant-1',
        fullName: 'Test Patient',
      });
      mockPrismaService.clinicalAlert.create.mockResolvedValue({ id: 'alert-1' });

      await service.create('nurse-1', {
        patientId: 'patient-1',
        encounterId: 'enc-1',
        systolicBP: 85,    // score 3
        heartRate: 135,     // score 3
        respiratoryRate: 25, // score 3
        oxygenSaturation: 91, // score 3
        temperature: 35.0,  // score 3
      } as any);

      expect(mockPrismaService.clinicalAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'DETERIORATION',
          severity: 'CRITICAL',
          source: 'CLINICAL_RULE',
        }),
      });
      expect(mockRealtimeGateway.emitAlert).toHaveBeenCalled();
    });
  });

  describe('getLatest', () => {
    it('should return most recent vital signs for patient', async () => {
      mockPrismaService.vitalSigns.findFirst.mockResolvedValue(mockVitalSigns);

      const result = await service.getLatest('patient-1');

      expect(result).toEqual(mockVitalSigns);
      expect(mockPrismaService.vitalSigns.findFirst).toHaveBeenCalledWith({
        where: { patientId: 'patient-1' },
        orderBy: { recordedAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should return null when no vitals found', async () => {
      mockPrismaService.vitalSigns.findFirst.mockResolvedValue(null);

      const result = await service.getLatest('patient-1');
      expect(result).toBeNull();
    });
  });

  describe('getTrends', () => {
    it('should return ordered history limited by count', async () => {
      const trendData = [
        { id: 'vs-1', recordedAt: new Date(), systolicBP: 120, diastolicBP: 80 },
        { id: 'vs-2', recordedAt: new Date(), systolicBP: 130, diastolicBP: 85 },
      ];
      mockPrismaService.vitalSigns.findMany.mockResolvedValue(trendData);

      const result = await service.getTrends('patient-1', 10);

      expect(result).toEqual(trendData);
      expect(mockPrismaService.vitalSigns.findMany).toHaveBeenCalledWith({
        where: { patientId: 'patient-1' },
        orderBy: { recordedAt: 'desc' },
        take: 10,
        select: expect.objectContaining({
          systolicBP: true,
          diastolicBP: true,
          heartRate: true,
          temperature: true,
          newsScore: true,
          newsClassification: true,
        }),
      });
    });
  });
});
