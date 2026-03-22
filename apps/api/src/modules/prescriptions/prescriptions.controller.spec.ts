import { Test, TestingModule } from '@nestjs/testing';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionSafetyService } from './prescription-safety.service';
import { PdfGeneratorService } from '../documents/pdf-generator.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

describe('PrescriptionsController', () => {
  let controller: PrescriptionsController;
  let service: PrescriptionsService;

  const mockUser: JwtPayload = {
    sub: 'user-1',
    email: 'doctor@voxpep.com',
    role: 'DOCTOR',
    tenantId: 'tenant-1',
  };

  const tenantId = 'tenant-1';

  const mockPrescription = {
    id: 'rx-1',
    encounterId: 'enc-1',
    status: 'ACTIVE',
    items: [],
  };

  const mockPrescriptionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByEncounter: jest.fn(),
    findByPatient: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
    sign: jest.fn(),
    addItem: jest.fn(),
    removeItem: jest.fn(),
    checkMedication: jest.fn(),
    findMedicationChecks: jest.fn(),
  };

  const mockPdfGeneratorService = {
    generatePrescriptionPdf: jest.fn(),
    generateMedicalCertificatePdf: jest.fn(),
    generateDischargeSummaryPdf: jest.fn(),
    generateTissGuidePdf: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrescriptionsController],
      providers: [
        { provide: PrescriptionsService, useValue: mockPrescriptionsService },
        {
          provide: PrescriptionSafetyService,
          useValue: {
            validateSafety: jest.fn(),
            generateSchedule: jest.fn(),
            firstCheck: jest.fn(),
            doubleCheck: jest.fn(),
          },
        },
        { provide: PdfGeneratorService, useValue: mockPdfGeneratorService },
      ],
    }).compile();

    controller = module.get<PrescriptionsController>(PrescriptionsController);
    service = module.get<PrescriptionsService>(PrescriptionsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a prescription', async () => {
      const dto = { encounterId: 'enc-1', items: [] };
      mockPrescriptionsService.create.mockResolvedValue(mockPrescription);

      const result = await controller.create(tenantId, mockUser, dto as never);

      expect(service.create).toHaveBeenCalledWith(tenantId, 'user-1', dto);
      expect(result).toEqual(mockPrescription);
    });
  });

  describe('findByEncounter', () => {
    it('should return prescriptions by encounter', async () => {
      mockPrescriptionsService.findByEncounter.mockResolvedValue([mockPrescription]);

      const result = await controller.findByEncounter('enc-1');

      expect(service.findByEncounter).toHaveBeenCalledWith('enc-1');
      expect(result).toEqual([mockPrescription]);
    });
  });

  describe('findByPatient', () => {
    it('should return prescriptions by patient', async () => {
      mockPrescriptionsService.findByPatient.mockResolvedValue([mockPrescription]);

      const result = await controller.findByPatient('patient-1');

      expect(service.findByPatient).toHaveBeenCalledWith('patient-1');
      expect(result).toEqual([mockPrescription]);
    });
  });

  describe('findById', () => {
    it('should return prescription by ID', async () => {
      mockPrescriptionsService.findById.mockResolvedValue(mockPrescription);

      const result = await controller.findById('rx-1');

      expect(service.findById).toHaveBeenCalledWith('rx-1');
      expect(result).toEqual(mockPrescription);
    });

    it('should propagate not found error', async () => {
      mockPrescriptionsService.findById.mockRejectedValue(new Error('Not found'));

      await expect(controller.findById('missing')).rejects.toThrow('Not found');
    });
  });

  describe('update', () => {
    it('should update prescription status when status is provided', async () => {
      const dto = { status: 'SUSPENDED' };
      const updated = { ...mockPrescription, status: 'SUSPENDED' };
      mockPrescriptionsService.updateStatus.mockResolvedValue(updated);

      const result = await controller.update('rx-1', dto as never);

      expect(service.updateStatus).toHaveBeenCalledWith('rx-1', 'SUSPENDED');
      expect(result.status).toBe('SUSPENDED');
    });

    it('should return current prescription when no status in dto', async () => {
      const dto = {};
      mockPrescriptionsService.findById.mockResolvedValue(mockPrescription);

      const result = await controller.update('rx-1', dto as never);

      expect(service.findById).toHaveBeenCalledWith('rx-1');
      expect(result).toEqual(mockPrescription);
    });
  });

  describe('sign', () => {
    it('should sign a prescription', async () => {
      const signed = { ...mockPrescription, signedAt: new Date(), signedById: 'user-1' };
      mockPrescriptionsService.sign.mockResolvedValue(signed);

      const result = await controller.sign('rx-1', mockUser);

      expect(service.sign).toHaveBeenCalledWith('rx-1', 'user-1');
      expect(result.signedById).toBe('user-1');
    });
  });

  describe('addItem', () => {
    it('should add item to prescription', async () => {
      const dto = { medicationName: 'Amoxicillin', dose: '500mg' };
      const expected = { id: 'item-1', ...dto };
      mockPrescriptionsService.addItem.mockResolvedValue(expected);

      const result = await controller.addItem('rx-1', dto as never);

      expect(service.addItem).toHaveBeenCalledWith('rx-1', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('removeItem', () => {
    it('should remove item from prescription', async () => {
      mockPrescriptionsService.removeItem.mockResolvedValue({ deleted: true });

      const result = await controller.removeItem('rx-1', 'item-1');

      expect(service.removeItem).toHaveBeenCalledWith('rx-1', 'item-1');
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('checkMedication', () => {
    it('should create medication check for an item', async () => {
      const data = { scheduledAt: '2026-03-21T10:00:00Z', status: 'ADMINISTERED' as const };
      const expected = { id: 'check-1', ...data };
      mockPrescriptionsService.checkMedication.mockResolvedValue(expected);

      const result = await controller.checkMedication('item-1', mockUser, data as never);

      expect(service.checkMedication).toHaveBeenCalledWith('item-1', 'user-1', data);
      expect(result).toEqual(expected);
    });
  });
});
