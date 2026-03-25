import { Test, TestingModule } from '@nestjs/testing';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { WristbandService } from './wristband.service';

describe('PatientsController', () => {
  let controller: PatientsController;
  let service: PatientsService;

  const tenantId = 'tenant-1';

  const mockPatient = {
    id: 'patient-1',
    fullName: 'Maria Silva',
    cpf: '12345678900',
    tenantId,
  };

  const mockPatientsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    getAllergies: jest.fn(),
    addAllergy: jest.fn(),
    removeAllergy: jest.fn(),
    getConditions: jest.fn(),
    addCondition: jest.fn(),
    getFamilyHistory: jest.fn(),
    addFamilyHistory: jest.fn(),
    getSurgicalHistory: jest.fn(),
    addSurgicalHistory: jest.fn(),
    getSocialHistory: jest.fn(),
    upsertSocialHistory: jest.fn(),
    getVaccinations: jest.fn(),
    addVaccination: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientsController],
      providers: [
        { provide: PatientsService, useValue: mockPatientsService },
        { provide: WristbandService, useValue: {
          generateWristbandPdf: jest.fn().mockResolvedValue(Buffer.from('fake-pdf')),
        }},
      ],
    }).compile();

    controller = module.get<PatientsController>(PatientsController);
    service = module.get<PatientsService>(PatientsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call patientsService.create with tenantId and dto', async () => {
      const dto = { name: 'Maria Silva', cpf: '12345678900', dateOfBirth: '1985-03-15', gender: 'FEMALE' };
      mockPatientsService.create.mockResolvedValue(mockPatient);

      const result = await controller.create(tenantId, dto as never);

      expect(service.create).toHaveBeenCalledWith(tenantId, dto);
      expect(result).toEqual(mockPatient);
    });

    it('should propagate conflict errors', async () => {
      mockPatientsService.create.mockRejectedValue(new Error('Conflict'));

      await expect(controller.create(tenantId, {} as never)).rejects.toThrow('Conflict');
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const query = { page: 1, pageSize: 10 };
      const expected = { data: [mockPatient], total: 1, totalPages: 1 };
      mockPatientsService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(tenantId, query as never);

      expect(service.findAll).toHaveBeenCalledWith(tenantId, query);
      expect(result).toEqual(expected);
    });

    it('should forward search query params', async () => {
      const query = { page: 1, pageSize: 10, name: 'Maria' };
      mockPatientsService.findAll.mockResolvedValue({ data: [], total: 0, totalPages: 0 });

      await controller.findAll(tenantId, query as never);

      expect(service.findAll).toHaveBeenCalledWith(tenantId, query);
    });
  });

  describe('findById', () => {
    it('should return patient details', async () => {
      mockPatientsService.findById.mockResolvedValue(mockPatient);

      const result = await controller.findById('patient-1', tenantId);

      expect(service.findById).toHaveBeenCalledWith('patient-1', tenantId);
      expect(result).toEqual(mockPatient);
    });

    it('should propagate not found errors', async () => {
      mockPatientsService.findById.mockRejectedValue(new Error('Not found'));

      await expect(controller.findById('missing', tenantId)).rejects.toThrow('Not found');
    });
  });

  describe('update', () => {
    it('should call patientsService.update with correct args', async () => {
      const dto = { phone: '11888888888' };
      const updated = { ...mockPatient, phone: '11888888888' };
      mockPatientsService.update.mockResolvedValue(updated);

      const result = await controller.update('patient-1', tenantId, dto as never);

      expect(service.update).toHaveBeenCalledWith('patient-1', tenantId, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('softDelete', () => {
    it('should call patientsService.softDelete', async () => {
      const deleted = { ...mockPatient, deletedAt: new Date() };
      mockPatientsService.softDelete.mockResolvedValue(deleted);

      const result = await controller.softDelete('patient-1', tenantId);

      expect(service.softDelete).toHaveBeenCalledWith('patient-1', tenantId);
      expect(result.deletedAt).toBeDefined();
    });
  });

  describe('getAllergies', () => {
    it('should return patient allergies', async () => {
      const allergies = [{ id: 'a1', substance: 'Penicillin' }];
      mockPatientsService.getAllergies.mockResolvedValue(allergies);

      const result = await controller.getAllergies('patient-1', tenantId);

      expect(service.getAllergies).toHaveBeenCalledWith('patient-1', tenantId);
      expect(result).toEqual(allergies);
    });
  });

  describe('addAllergy', () => {
    it('should add allergy to patient', async () => {
      const data = { substance: 'Penicillin', reaction: 'Rash', severity: 'MODERATE' };
      const expected = { id: 'a1', ...data };
      mockPatientsService.addAllergy.mockResolvedValue(expected);

      const result = await controller.addAllergy('patient-1', tenantId, data);

      expect(service.addAllergy).toHaveBeenCalledWith('patient-1', tenantId, data);
      expect(result).toEqual(expected);
    });
  });
});
