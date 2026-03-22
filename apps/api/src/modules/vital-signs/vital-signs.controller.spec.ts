import { Test, TestingModule } from '@nestjs/testing';
import { VitalSignsController } from './vital-signs.controller';
import { VitalSignsService } from './vital-signs.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

describe('VitalSignsController', () => {
  let controller: VitalSignsController;
  let service: VitalSignsService;

  const mockUser: JwtPayload = {
    sub: 'user-1',
    email: 'nurse@voxpep.com',
    role: 'NURSE',
    tenantId: 'tenant-1',
  };

  const mockVitalSigns = {
    id: 'vs-1',
    patientId: 'patient-1',
    encounterId: 'enc-1',
    temperature: 36.5,
    heartRate: 72,
    systolicBp: 120,
    diastolicBp: 80,
  };

  const mockVitalSignsService = {
    create: jest.fn(),
    findByEncounter: jest.fn(),
    findByPatient: jest.fn(),
    getLatest: jest.fn(),
    getTrends: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VitalSignsController],
      providers: [
        { provide: VitalSignsService, useValue: mockVitalSignsService },
      ],
    }).compile();

    controller = module.get<VitalSignsController>(VitalSignsController);
    service = module.get<VitalSignsService>(VitalSignsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should record vital signs', async () => {
      const dto = { patientId: 'patient-1', encounterId: 'enc-1', temperature: 36.5, heartRate: 72 };
      mockVitalSignsService.create.mockResolvedValue(mockVitalSigns);

      const result = await controller.create(mockUser, dto as never);

      expect(service.create).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(mockVitalSigns);
    });

    it('should propagate validation errors', async () => {
      mockVitalSignsService.create.mockRejectedValue(new Error('Validation failed'));

      await expect(controller.create(mockUser, {} as never)).rejects.toThrow('Validation failed');
    });
  });

  describe('findByEncounter', () => {
    it('should return vital signs for an encounter', async () => {
      mockVitalSignsService.findByEncounter.mockResolvedValue([mockVitalSigns]);

      const result = await controller.findByEncounter('enc-1');

      expect(service.findByEncounter).toHaveBeenCalledWith('enc-1');
      expect(result).toEqual([mockVitalSigns]);
    });
  });

  describe('findByPatient', () => {
    it('should return paginated vital signs for a patient', async () => {
      const pagination = { page: 1, pageSize: 10 };
      const expected = { data: [mockVitalSigns], total: 1 };
      mockVitalSignsService.findByPatient.mockResolvedValue(expected);

      const result = await controller.findByPatient('patient-1', pagination as never);

      expect(service.findByPatient).toHaveBeenCalledWith('patient-1', pagination);
      expect(result).toEqual(expected);
    });
  });

  describe('getLatest', () => {
    it('should return latest vital signs for a patient', async () => {
      mockVitalSignsService.getLatest.mockResolvedValue(mockVitalSigns);

      const result = await controller.getLatest('patient-1');

      expect(service.getLatest).toHaveBeenCalledWith('patient-1');
      expect(result).toEqual(mockVitalSigns);
    });
  });

  describe('getTrends', () => {
    it('should return trends with default count', async () => {
      const trends = [mockVitalSigns];
      mockVitalSignsService.getTrends.mockResolvedValue(trends);

      const result = await controller.getTrends('patient-1');

      expect(service.getTrends).toHaveBeenCalledWith('patient-1', 20);
      expect(result).toEqual(trends);
    });

    it('should parse count query param', async () => {
      mockVitalSignsService.getTrends.mockResolvedValue([]);

      await controller.getTrends('patient-1', '50');

      expect(service.getTrends).toHaveBeenCalledWith('patient-1', 50);
    });
  });

  describe('findById', () => {
    it('should return vital signs by ID', async () => {
      mockVitalSignsService.findById.mockResolvedValue(mockVitalSigns);

      const result = await controller.findById('vs-1');

      expect(service.findById).toHaveBeenCalledWith('vs-1');
      expect(result).toEqual(mockVitalSigns);
    });

    it('should propagate not found error', async () => {
      mockVitalSignsService.findById.mockRejectedValue(new Error('Not found'));

      await expect(controller.findById('missing')).rejects.toThrow('Not found');
    });
  });
});
