import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SurgicalService } from './surgical.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SurgicalService', () => {
  let service: SurgicalService;
  let prisma: any;

  const mockProcedure = {
    id: 'surg-1',
    encounterId: 'enc-1',
    patientId: 'patient-1',
    tenantId: 'tenant-1',
    surgeonId: 'doc-1',
    procedureName: 'Appendectomy',
    procedureCode: '44970',
    status: 'SCHEDULED',
    scheduledAt: new Date(),
    patientInAt: null,
    patientOutAt: null,
    surgicalDescription: null,
    complications: null,
    bloodLoss: null,
    createdAt: new Date(),
    patient: { id: 'patient-1', fullName: 'Maria Silva', mrn: 'MRN-001' },
    surgeon: { id: 'doc-1', name: 'Dr. Silva' },
    firstAssistant: null,
    anesthesiologist: null,
    scrubNurse: null,
    circulatingNurse: null,
  };

  const mockPrisma = {
    surgicalProcedure: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SurgicalService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SurgicalService>(SurgicalService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('schedule', () => {
    it('should schedule a procedure', async () => {
      const dto = {
        encounterId: 'enc-1',
        patientId: 'patient-1',
        surgeonId: 'doc-1',
        procedureName: 'Appendectomy',
        procedureCode: '44970',
        scheduledAt: '2026-03-25T10:00:00Z',
      };

      prisma.surgicalProcedure.create.mockResolvedValue(mockProcedure);

      const result = await service.schedule('tenant-1', dto as any);

      expect(result).toEqual(mockProcedure);
      expect(prisma.surgicalProcedure.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          patientId: 'patient-1',
          surgeonId: 'doc-1',
          procedureName: 'Appendectomy',
          scheduledAt: expect.any(Date),
        }),
      });
    });
  });

  describe('findById', () => {
    it('should return procedure with team members', async () => {
      prisma.surgicalProcedure.findUnique.mockResolvedValue(mockProcedure);

      const result = await service.findById('surg-1');

      expect(result).toEqual(mockProcedure);
    });

    it('should throw NotFoundException for non-existent procedure', async () => {
      prisma.surgicalProcedure.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should set patientInAt when status is IN_PROGRESS', async () => {
      prisma.surgicalProcedure.findUnique.mockResolvedValue(mockProcedure);
      prisma.surgicalProcedure.update.mockResolvedValue({
        ...mockProcedure,
        status: 'IN_PROGRESS',
        patientInAt: new Date(),
      });

      await service.updateStatus('surg-1', 'IN_PROGRESS' as any);

      expect(prisma.surgicalProcedure.update).toHaveBeenCalledWith({
        where: { id: 'surg-1' },
        data: {
          status: 'IN_PROGRESS',
          patientInAt: expect.any(Date),
        },
      });
    });

    it('should set patientOutAt when status is COMPLETED', async () => {
      prisma.surgicalProcedure.findUnique.mockResolvedValue(mockProcedure);
      prisma.surgicalProcedure.update.mockResolvedValue({
        ...mockProcedure,
        status: 'COMPLETED',
        patientOutAt: new Date(),
      });

      await service.updateStatus('surg-1', 'COMPLETED' as any);

      expect(prisma.surgicalProcedure.update).toHaveBeenCalledWith({
        where: { id: 'surg-1' },
        data: {
          status: 'COMPLETED',
          patientOutAt: expect.any(Date),
        },
      });
    });
  });

  describe('updateChecklist', () => {
    it('should update before phase checklist', async () => {
      prisma.surgicalProcedure.findUnique.mockResolvedValue(mockProcedure);
      prisma.surgicalProcedure.update.mockResolvedValue(mockProcedure);

      const checklist = { patientIdentified: true, siteMarked: true };

      await service.updateChecklist('surg-1', 'before', checklist);

      expect(prisma.surgicalProcedure.update).toHaveBeenCalledWith({
        where: { id: 'surg-1' },
        data: { safetyChecklistBefore: checklist },
      });
    });

    it('should update during phase checklist', async () => {
      prisma.surgicalProcedure.findUnique.mockResolvedValue(mockProcedure);
      prisma.surgicalProcedure.update.mockResolvedValue(mockProcedure);

      const checklist = { teamIntroduced: true };

      await service.updateChecklist('surg-1', 'during', checklist);

      expect(prisma.surgicalProcedure.update).toHaveBeenCalledWith({
        where: { id: 'surg-1' },
        data: { safetyChecklistDuring: checklist },
      });
    });

    it('should update after phase checklist', async () => {
      prisma.surgicalProcedure.findUnique.mockResolvedValue(mockProcedure);
      prisma.surgicalProcedure.update.mockResolvedValue(mockProcedure);

      const checklist = { specimenLabeled: true, instrumentCountCorrect: true };

      await service.updateChecklist('surg-1', 'after', checklist);

      expect(prisma.surgicalProcedure.update).toHaveBeenCalledWith({
        where: { id: 'surg-1' },
        data: { safetyChecklistAfter: checklist },
      });
    });
  });

  describe('complete', () => {
    it('should set status COMPLETED with all data fields', async () => {
      prisma.surgicalProcedure.findUnique.mockResolvedValue(mockProcedure);
      const completed = {
        ...mockProcedure,
        status: 'COMPLETED',
        patientOutAt: new Date(),
        surgicalDescription: 'Successful appendectomy',
        complications: 'None',
        bloodLoss: 50,
      };
      prisma.surgicalProcedure.update.mockResolvedValue(completed);

      const result = await service.complete('surg-1', {
        surgicalDescription: 'Successful appendectomy',
        complications: 'None',
        bloodLoss: 50,
      });

      expect(result.status).toBe('COMPLETED');
      expect(prisma.surgicalProcedure.update).toHaveBeenCalledWith({
        where: { id: 'surg-1' },
        data: {
          status: 'COMPLETED',
          patientOutAt: expect.any(Date),
          surgicalDescription: 'Successful appendectomy',
          complications: 'None',
          bloodLoss: 50,
        },
      });
    });
  });
});
