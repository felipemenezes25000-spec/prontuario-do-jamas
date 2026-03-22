import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdmissionsService } from './admissions.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AdmissionsService', () => {
  let service: AdmissionsService;

  const tenantId = 'tenant-1';

  const mockAdmission = {
    id: 'adm-1',
    encounterId: 'enc-1',
    patientId: 'patient-1',
    tenantId,
    admittingDoctorId: 'doc-1',
    attendingDoctorId: 'doc-1',
    admissionDate: new Date(),
    currentBedId: 'bed-1',
    admissionBedId: 'bed-1',
    actualDischargeDate: null,
    patient: { id: 'patient-1', fullName: 'Maria Silva', mrn: 'MRN-0001' },
    admittingDoctor: { id: 'doc-1', name: 'Dr. Test' },
    attendingDoctor: { id: 'doc-1', name: 'Dr. Test' },
    currentBed: { id: 'bed-1', name: 'Bed 1', ward: 'Ward A', status: 'OCCUPIED' },
    bedTransfers: [],
  };

  const mockTx = {
    admission: {
      create: jest.fn(),
      update: jest.fn(),
    },
    bed: {
      update: jest.fn(),
    },
    encounter: {
      update: jest.fn(),
    },
    bedTransfer: {
      create: jest.fn(),
    },
  };

  const mockPrismaService = {
    admission: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    bed: {
      update: jest.fn(),
    },
    encounter: {
      update: jest.fn(),
    },
    bedTransfer: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(mockTx)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdmissionsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AdmissionsService>(AdmissionsService);
    jest.clearAllMocks();
  });

  describe('admit', () => {
    const admitDto = {
      encounterId: 'enc-1',
      patientId: 'patient-1',
      admittingDoctorId: 'doc-1',
      attendingDoctorId: 'doc-1',
      admissionType: 'ELECTIVE',
      bedId: 'bed-1',
    };

    it('should create admission and occupy bed in a transaction', async () => {
      mockTx.admission.create.mockResolvedValue(mockAdmission);
      mockTx.bed.update.mockResolvedValue({});
      mockTx.encounter.update.mockResolvedValue({});

      const result = await service.admit(tenantId, admitDto as any);

      expect(result).toEqual(mockAdmission);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockTx.admission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          patientId: 'patient-1',
          currentBedId: 'bed-1',
        }),
      });
      expect(mockTx.bed.update).toHaveBeenCalledWith({
        where: { id: 'bed-1' },
        data: {
          status: 'OCCUPIED',
          currentPatientId: 'patient-1',
        },
      });
      expect(mockTx.encounter.update).toHaveBeenCalledWith({
        where: { id: 'enc-1' },
        data: { status: 'IN_PROGRESS' },
      });
    });

    it('should create admission without bed assignment', async () => {
      const noBedDto = { ...admitDto, bedId: undefined };
      mockTx.admission.create.mockResolvedValue({
        ...mockAdmission,
        currentBedId: null,
      });
      mockTx.encounter.update.mockResolvedValue({});

      await service.admit(tenantId, noBedDto as any);

      expect(mockTx.bed.update).not.toHaveBeenCalled();
    });
  });

  describe('discharge', () => {
    const dischargeDto = {
      dischargeType: 'MEDICAL',
      diagnosisAtDischarge: 'Recovered',
      dischargeNotes: 'Patient recovered well',
    };

    it('should free bed and set discharge fields', async () => {
      mockPrismaService.admission.findUnique.mockResolvedValue(mockAdmission);
      mockTx.admission.update.mockResolvedValue({
        ...mockAdmission,
        actualDischargeDate: new Date(),
        dischargeType: 'MEDICAL',
      });
      mockTx.bed.update.mockResolvedValue({});
      mockTx.encounter.update.mockResolvedValue({});

      const result = await service.discharge('adm-1', dischargeDto as any);

      expect(result.actualDischargeDate).toBeInstanceOf(Date);
      expect(mockTx.bed.update).toHaveBeenCalledWith({
        where: { id: 'bed-1' },
        data: {
          status: 'CLEANING',
          currentPatientId: null,
        },
      });
      expect(mockTx.encounter.update).toHaveBeenCalledWith({
        where: { id: 'enc-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          completedAt: expect.any(Date),
        }),
      });
    });

    it('should throw BadRequestException if already discharged', async () => {
      mockPrismaService.admission.findUnique.mockResolvedValue({
        ...mockAdmission,
        actualDischargeDate: new Date(),
      });

      await expect(
        service.discharge('adm-1', dischargeDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent admission', async () => {
      mockPrismaService.admission.findUnique.mockResolvedValue(null);

      await expect(
        service.discharge('nonexistent', dischargeDto as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('transfer', () => {
    const transferDto = {
      toBedId: 'bed-2',
      reason: 'Needs ICU',
    };

    it('should create BedTransfer and update beds', async () => {
      mockPrismaService.admission.findUnique.mockResolvedValue(mockAdmission);
      mockTx.bedTransfer.create.mockResolvedValue({
        id: 'transfer-1',
        fromBedId: 'bed-1',
        toBedId: 'bed-2',
      });
      mockTx.bed.update.mockResolvedValue({});
      mockTx.admission.update.mockResolvedValue({});

      const result = await service.transfer('adm-1', 'user-1', transferDto as any);

      expect(result.fromBedId).toBe('bed-1');
      expect(result.toBedId).toBe('bed-2');

      // Frees old bed
      expect(mockTx.bed.update).toHaveBeenCalledWith({
        where: { id: 'bed-1' },
        data: { status: 'CLEANING', currentPatientId: null },
      });

      // Occupies new bed
      expect(mockTx.bed.update).toHaveBeenCalledWith({
        where: { id: 'bed-2' },
        data: { status: 'OCCUPIED', currentPatientId: 'patient-1' },
      });

      // Updates admission
      expect(mockTx.admission.update).toHaveBeenCalledWith({
        where: { id: 'adm-1' },
        data: { currentBedId: 'bed-2' },
      });
    });

    it('should throw BadRequestException when patient has no current bed', async () => {
      mockPrismaService.admission.findUnique.mockResolvedValue({
        ...mockAdmission,
        currentBedId: null,
      });

      await expect(
        service.transfer('adm-1', 'user-1', transferDto as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
