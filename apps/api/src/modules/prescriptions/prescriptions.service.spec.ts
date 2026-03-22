import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionSafetyService } from './prescription-safety.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PrescriptionsService', () => {
  let service: PrescriptionsService;

  const mockPrescription = {
    id: 'rx-1',
    tenantId: 'tenant-1',
    doctorId: 'doc-1',
    patientId: 'patient-1',
    encounterId: 'enc-1',
    type: 'MEDICATION',
    status: 'DRAFT',
    signedAt: null,
    createdAt: new Date(),
    items: [
      {
        id: 'item-1',
        prescriptionId: 'rx-1',
        medication: 'Dipirona',
        dose: '500mg',
        route: 'ORAL',
        frequency: '6/6h',
        sortOrder: 0,
      },
    ],
    doctor: { id: 'doc-1', name: 'Dr. Test' },
    patient: { id: 'patient-1', fullName: 'Maria Silva', mrn: 'MRN-0001' },
    doubleCheckedBy: null,
    dispensedBy: null,
  };

  const mockTx = {
    prescription: {
      create: jest.fn(),
    },
  };

  const mockPrismaService = {
    prescription: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    prescriptionItem: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    medicationCheck: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(mockTx)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PrescriptionSafetyService, useValue: {
          validateSafety: jest.fn().mockReturnValue({ errors: [], warnings: [], infos: [] }),
          generateSchedule: jest.fn(),
          firstCheck: jest.fn(),
          doubleCheck: jest.fn(),
          validateControlledSubstance: jest.fn(),
          validateAntimicrobial: jest.fn(),
          requiresDoubleCheck: jest.fn(),
        }},
      ],
    }).compile();

    service = module.get<PrescriptionsService>(PrescriptionsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create prescription with items in a transaction', async () => {
      const dto = {
        patientId: 'patient-1',
        encounterId: 'enc-1',
        type: 'MEDICATION',
        items: [
          { medication: 'Dipirona', dose: '500mg', route: 'ORAL', frequency: '6/6h' },
        ],
      };

      mockTx.prescription.create.mockResolvedValue(mockPrescription);

      const result = await service.create('tenant-1', 'doc-1', dto as any);

      expect(result).toEqual(mockPrescription);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockTx.prescription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            doctorId: 'doc-1',
            patientId: 'patient-1',
            items: expect.objectContaining({
              create: expect.any(Array),
            }),
          }),
          include: { items: true },
        }),
      );
    });
  });

  describe('sign', () => {
    it('should set signedAt and status to ACTIVE', async () => {
      mockPrismaService.prescription.findUnique.mockResolvedValue({
        ...mockPrescription,
        signedAt: null,
      });
      mockPrismaService.prescription.update.mockResolvedValue({
        ...mockPrescription,
        signedAt: new Date(),
        status: 'ACTIVE',
      });

      const result = await service.sign('rx-1', 'doc-1');

      expect(result.signedAt).toBeInstanceOf(Date);
      expect(mockPrismaService.prescription.update).toHaveBeenCalledWith({
        where: { id: 'rx-1' },
        data: {
          signedAt: expect.any(Date),
          status: 'ACTIVE',
        },
      });
    });

    it('should throw BadRequestException if already signed', async () => {
      mockPrismaService.prescription.findUnique.mockResolvedValue({
        ...mockPrescription,
        signedAt: new Date(),
      });

      await expect(service.sign('rx-1', 'doc-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('addItem', () => {
    it('should add item to existing prescription', async () => {
      mockPrismaService.prescription.findUnique.mockResolvedValue(mockPrescription);
      const newItem = {
        medication: 'Paracetamol',
        dose: '750mg',
        route: 'ORAL',
        frequency: '8/8h',
      };
      mockPrismaService.prescriptionItem.create.mockResolvedValue({
        id: 'item-2',
        prescriptionId: 'rx-1',
        ...newItem,
      });

      const result = await service.addItem('rx-1', newItem as any);

      expect(result.medication).toBe('Paracetamol');
      expect(mockPrismaService.prescriptionItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          prescriptionId: 'rx-1',
          medication: 'Paracetamol',
        }),
      });
    });
  });

  describe('checkMedication', () => {
    it('should create a MedicationCheck record', async () => {
      const item = { id: 'item-1', prescriptionId: 'rx-1' };
      mockPrismaService.prescriptionItem.findUnique.mockResolvedValue(item);
      mockPrismaService.medicationCheck.create.mockResolvedValue({
        id: 'check-1',
        prescriptionItemId: 'item-1',
        nurseId: 'nurse-1',
        scheduledAt: new Date(),
        checkedAt: new Date(),
        status: 'ADMINISTERED',
      });

      const result = await service.checkMedication('item-1', 'nurse-1', {
        scheduledAt: '2025-03-21T10:00:00Z',
        status: 'ADMINISTERED' as any,
      });

      expect(result.id).toBe('check-1');
      expect(mockPrismaService.medicationCheck.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          prescriptionItemId: 'item-1',
          nurseId: 'nurse-1',
          status: 'ADMINISTERED',
        }),
      });
    });

    it('should throw NotFoundException if item does not exist', async () => {
      mockPrismaService.prescriptionItem.findUnique.mockResolvedValue(null);

      await expect(
        service.checkMedication('nonexistent', 'nurse-1', {
          scheduledAt: '2025-03-21T10:00:00Z',
          status: 'ADMINISTERED' as any,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByPatient', () => {
    it('should return only active prescriptions by default', async () => {
      mockPrismaService.prescription.findMany.mockResolvedValue([
        { ...mockPrescription, status: 'ACTIVE' },
      ]);

      const result = await service.findByPatient('patient-1');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.prescription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: 'patient-1', status: 'ACTIVE' },
        }),
      );
    });

    it('should return all prescriptions when activeOnly is false', async () => {
      mockPrismaService.prescription.findMany.mockResolvedValue([mockPrescription]);

      await service.findByPatient('patient-1', false);

      expect(mockPrismaService.prescription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: 'patient-1' },
        }),
      );
    });
  });
});
