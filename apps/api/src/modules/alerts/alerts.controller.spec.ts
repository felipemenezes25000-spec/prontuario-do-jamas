import { Test, TestingModule } from '@nestjs/testing';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

describe('AlertsController', () => {
  let controller: AlertsController;
  let service: AlertsService;

  const tenantId = 'tenant-1';

  const mockUser: JwtPayload = {
    sub: 'user-1',
    email: 'doctor@voxpep.com',
    role: 'DOCTOR',
    tenantId: 'tenant-1',
  };

  const mockAlert = {
    id: 'alert-1',
    patientId: 'patient-1',
    type: 'CRITICAL_LAB',
    severity: 'HIGH',
    title: 'Potassium level critical',
    isActive: true,
    tenantId,
  };

  const mockAlertsService = {
    create: jest.fn(),
    findActive: jest.fn(),
    findByPatient: jest.fn(),
    findById: jest.fn(),
    acknowledge: jest.fn(),
    resolve: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [
        { provide: AlertsService, useValue: mockAlertsService },
      ],
    }).compile();

    controller = module.get<AlertsController>(AlertsController);
    service = module.get<AlertsService>(AlertsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a clinical alert', async () => {
      const dto = { patientId: 'patient-1', type: 'CRITICAL_LAB', severity: 'HIGH', title: 'Potassium critical' };
      mockAlertsService.create.mockResolvedValue(mockAlert);

      const result = await controller.create(tenantId, dto as never);

      expect(service.create).toHaveBeenCalledWith(tenantId, dto);
      expect(result).toEqual(mockAlert);
    });

    it('should propagate errors', async () => {
      mockAlertsService.create.mockRejectedValue(new Error('Bad request'));

      await expect(controller.create(tenantId, {} as never)).rejects.toThrow('Bad request');
    });
  });

  describe('findActive', () => {
    it('should return active alerts for tenant', async () => {
      mockAlertsService.findActive.mockResolvedValue([mockAlert]);

      const result = await controller.findActive(tenantId);

      expect(service.findActive).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual([mockAlert]);
    });
  });

  describe('findByPatient', () => {
    it('should return alerts by patient', async () => {
      mockAlertsService.findByPatient.mockResolvedValue([mockAlert]);

      const result = await controller.findByPatient('patient-1');

      expect(service.findByPatient).toHaveBeenCalledWith('patient-1');
      expect(result).toEqual([mockAlert]);
    });
  });

  describe('findById', () => {
    it('should return alert by ID', async () => {
      mockAlertsService.findById.mockResolvedValue(mockAlert);

      const result = await controller.findById('alert-1');

      expect(service.findById).toHaveBeenCalledWith('alert-1');
      expect(result).toEqual(mockAlert);
    });

    it('should propagate not found error', async () => {
      mockAlertsService.findById.mockRejectedValue(new Error('Not found'));

      await expect(controller.findById('missing')).rejects.toThrow('Not found');
    });
  });

  describe('acknowledge', () => {
    it('should acknowledge an alert with action taken', async () => {
      const acknowledged = { ...mockAlert, acknowledgedAt: new Date(), acknowledgedById: 'user-1' };
      mockAlertsService.acknowledge.mockResolvedValue(acknowledged);

      const result = await controller.acknowledge('alert-1', mockUser, 'Contacted patient');

      expect(service.acknowledge).toHaveBeenCalledWith('alert-1', 'user-1', 'Contacted patient');
      expect(result.acknowledgedById).toBe('user-1');
    });

    it('should acknowledge without action taken', async () => {
      const acknowledged = { ...mockAlert, acknowledgedAt: new Date(), acknowledgedById: 'user-1' };
      mockAlertsService.acknowledge.mockResolvedValue(acknowledged);

      const result = await controller.acknowledge('alert-1', mockUser, undefined);

      expect(service.acknowledge).toHaveBeenCalledWith('alert-1', 'user-1', undefined);
      expect(result).toBeDefined();
    });
  });

  describe('resolve', () => {
    it('should resolve an alert', async () => {
      const resolved = { ...mockAlert, isActive: false, resolvedAt: new Date() };
      mockAlertsService.resolve.mockResolvedValue(resolved);

      const result = await controller.resolve('alert-1', mockUser);

      expect(service.resolve).toHaveBeenCalledWith('alert-1', 'user-1');
      expect(result.isActive).toBe(false);
    });
  });
});
