import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ExamsService', () => {
  let service: ExamsService;
  let prisma: any;

  const mockExam = {
    id: 'exam-1',
    patientId: 'patient-1',
    encounterId: 'enc-1',
    examName: 'Complete Blood Count',
    examCode: 'CBC',
    examType: 'LAB',
    status: 'REQUESTED',
    requestedById: 'doc-1',
    requestedAt: new Date(),
    completedAt: null,
    labResults: null,
    createdAt: new Date(),
    patient: { id: 'patient-1', fullName: 'Maria Silva', mrn: 'MRN-001' },
    requestedBy: { id: 'doc-1', name: 'Dr. Silva' },
    reviewedBy: null,
  };

  const mockPrisma = {
    examResult: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ExamsService>(ExamsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('request', () => {
    it('should create exam with REQUESTED status', async () => {
      const dto = {
        patientId: 'patient-1',
        encounterId: 'enc-1',
        examName: 'Complete Blood Count',
        examCode: 'CBC',
        examType: 'LAB',
      };

      prisma.examResult.create.mockResolvedValue(mockExam);

      const result = await service.request('doc-1', dto as any);

      expect(result).toEqual(mockExam);
      expect(prisma.examResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId: 'patient-1',
          requestedById: 'doc-1',
          status: 'REQUESTED',
          requestedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('addResults', () => {
    it('should update record with lab data and mark as COMPLETED', async () => {
      prisma.examResult.findUnique.mockResolvedValue(mockExam);
      const completedExam = {
        ...mockExam,
        status: 'COMPLETED',
        labResults: { hemoglobin: 14.5 },
        completedAt: new Date(),
      };
      prisma.examResult.update.mockResolvedValue(completedExam);

      const dto = {
        labResults: { hemoglobin: 14.5 },
      };

      const result = await service.addResults('exam-1', 'reviewer-1', dto as any);

      expect(result.status).toBe('COMPLETED');
      expect(prisma.examResult.update).toHaveBeenCalledWith({
        where: { id: 'exam-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          completedAt: expect.any(Date),
          reviewedAt: expect.any(Date),
          reviewedById: 'reviewer-1',
        }),
      });
    });

    it('should throw NotFoundException for non-existent exam', async () => {
      prisma.examResult.findUnique.mockResolvedValue(null);

      await expect(
        service.addResults('nonexistent', 'reviewer-1', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByPatient', () => {
    it('should return exams sorted by date desc', async () => {
      prisma.examResult.findMany.mockResolvedValue([mockExam]);

      const result = await service.findByPatient('patient-1');

      expect(result).toEqual([mockExam]);
      expect(prisma.examResult.findMany).toHaveBeenCalledWith({
        where: { patientId: 'patient-1' },
        orderBy: { createdAt: 'desc' },
        include: {
          requestedBy: { select: { id: true, name: true } },
        },
      });
    });
  });

  describe('getPending', () => {
    it('should return only REQUESTED/SCHEDULED/COLLECTED/IN_PROGRESS exams', async () => {
      prisma.examResult.findMany.mockResolvedValue([mockExam]);

      const result = await service.getPending('tenant-1');

      expect(result).toEqual([mockExam]);
      expect(prisma.examResult.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['REQUESTED', 'SCHEDULED', 'COLLECTED', 'IN_PROGRESS'] },
          patient: { tenantId: 'tenant-1' },
        },
        orderBy: { requestedAt: 'asc' },
        include: expect.objectContaining({
          patient: { select: { id: true, fullName: true, mrn: true } },
        }),
      });
    });
  });
});
