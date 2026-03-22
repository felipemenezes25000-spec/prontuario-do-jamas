import { Test, TestingModule } from '@nestjs/testing';
import { AdmissionsController } from './admissions.controller';
import { AdmissionsService } from './admissions.service';
import { BedsService } from './beds.service';
import { PdfGeneratorService } from '../documents/pdf-generator.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

describe('AdmissionsController', () => {
  let controller: AdmissionsController;
  let admissionsService: AdmissionsService;
  let bedsService: BedsService;

  const tenantId = 'tenant-1';

  const mockUser: JwtPayload = {
    sub: 'user-1',
    email: 'doctor@voxpep.com',
    role: 'DOCTOR',
    tenantId: 'tenant-1',
  };

  const mockAdmission = {
    id: 'adm-1',
    patientId: 'patient-1',
    bedId: 'bed-1',
    status: 'ACTIVE',
    tenantId,
  };

  const mockBed = {
    id: 'bed-1',
    number: '101',
    ward: 'ICU',
    status: 'AVAILABLE',
    tenantId,
  };

  const mockAdmissionsService = {
    admit: jest.fn(),
    discharge: jest.fn(),
    transfer: jest.fn(),
    findActive: jest.fn(),
    findById: jest.fn(),
    findByPatient: jest.fn(),
    findAll: jest.fn(),
    reverseDischarge: jest.fn(),
  };

  const mockBedsService = {
    findAll: jest.fn(),
    findAvailable: jest.fn(),
    getOccupancyStats: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockPdfGeneratorService = {
    generatePrescriptionPdf: jest.fn(),
    generateMedicalCertificatePdf: jest.fn(),
    generateDischargeSummaryPdf: jest.fn(),
    generateTissGuidePdf: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdmissionsController],
      providers: [
        { provide: AdmissionsService, useValue: mockAdmissionsService },
        { provide: BedsService, useValue: mockBedsService },
        { provide: PdfGeneratorService, useValue: mockPdfGeneratorService },
      ],
    }).compile();

    controller = module.get<AdmissionsController>(AdmissionsController);
    admissionsService = module.get<AdmissionsService>(AdmissionsService);
    bedsService = module.get<BedsService>(BedsService);
    jest.clearAllMocks();
  });

  describe('admit', () => {
    it('should admit a patient', async () => {
      const dto = { patientId: 'patient-1', bedId: 'bed-1', reason: 'Surgery' };
      mockAdmissionsService.admit.mockResolvedValue(mockAdmission);

      const result = await controller.admit(tenantId, dto as never);

      expect(admissionsService.admit).toHaveBeenCalledWith(tenantId, dto);
      expect(result).toEqual(mockAdmission);
    });

    it('should propagate errors', async () => {
      mockAdmissionsService.admit.mockRejectedValue(new Error('Bed occupied'));

      await expect(controller.admit(tenantId, {} as never)).rejects.toThrow('Bed occupied');
    });
  });

  describe('discharge', () => {
    it('should discharge a patient', async () => {
      const dto = { reason: 'Recovered', instructions: 'Rest for 2 weeks' };
      const discharged = { ...mockAdmission, status: 'DISCHARGED' };
      mockAdmissionsService.discharge.mockResolvedValue(discharged);

      const result = await controller.discharge('adm-1', dto as never);

      expect(admissionsService.discharge).toHaveBeenCalledWith('adm-1', dto);
      expect(result.status).toBe('DISCHARGED');
    });
  });

  describe('transfer', () => {
    it('should transfer a patient to another bed', async () => {
      const dto = { newBedId: 'bed-2', reason: 'ICU transfer' };
      const transferred = { ...mockAdmission, bedId: 'bed-2' };
      mockAdmissionsService.transfer.mockResolvedValue(transferred);

      const result = await controller.transfer('adm-1', mockUser, dto as never);

      expect(admissionsService.transfer).toHaveBeenCalledWith('adm-1', 'user-1', dto);
      expect(result.bedId).toBe('bed-2');
    });
  });

  describe('findActive', () => {
    it('should return active admissions', async () => {
      mockAdmissionsService.findActive.mockResolvedValue([mockAdmission]);

      const result = await controller.findActive(tenantId);

      expect(admissionsService.findActive).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual([mockAdmission]);
    });
  });

  describe('findById', () => {
    it('should return admission by ID', async () => {
      mockAdmissionsService.findById.mockResolvedValue(mockAdmission);

      const result = await controller.findById('adm-1');

      expect(admissionsService.findById).toHaveBeenCalledWith('adm-1');
      expect(result).toEqual(mockAdmission);
    });

    it('should propagate not found error', async () => {
      mockAdmissionsService.findById.mockRejectedValue(new Error('Not found'));

      await expect(controller.findById('missing')).rejects.toThrow('Not found');
    });
  });

  describe('findByPatient', () => {
    it('should return admissions by patient', async () => {
      mockAdmissionsService.findByPatient.mockResolvedValue([mockAdmission]);

      const result = await controller.findByPatient('patient-1');

      expect(admissionsService.findByPatient).toHaveBeenCalledWith('patient-1');
      expect(result).toEqual([mockAdmission]);
    });
  });

  describe('findAllBeds', () => {
    it('should return all beds with filters', async () => {
      mockBedsService.findAll.mockResolvedValue([mockBed]);

      const result = await controller.findAllBeds(tenantId, 'ICU', '1', undefined);

      expect(bedsService.findAll).toHaveBeenCalledWith(tenantId, { ward: 'ICU', floor: '1', status: undefined });
      expect(result).toEqual([mockBed]);
    });
  });

  describe('findAvailableBeds', () => {
    it('should return available beds', async () => {
      mockBedsService.findAvailable.mockResolvedValue([mockBed]);

      const result = await controller.findAvailableBeds(tenantId);

      expect(bedsService.findAvailable).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual([mockBed]);
    });
  });

  describe('getBedStats', () => {
    it('should return bed occupancy statistics', async () => {
      const stats = { total: 100, occupied: 75, available: 25 };
      mockBedsService.getOccupancyStats.mockResolvedValue(stats);

      const result = await controller.getBedStats(tenantId);

      expect(bedsService.getOccupancyStats).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual(stats);
    });
  });

  describe('updateBedStatus', () => {
    it('should update bed status', async () => {
      const updated = { ...mockBed, status: 'MAINTENANCE' };
      mockBedsService.updateStatus.mockResolvedValue(updated);

      const result = await controller.updateBedStatus('bed-1', 'MAINTENANCE' as never);

      expect(bedsService.updateStatus).toHaveBeenCalledWith('bed-1', 'MAINTENANCE');
      expect(result.status).toBe('MAINTENANCE');
    });
  });
});
