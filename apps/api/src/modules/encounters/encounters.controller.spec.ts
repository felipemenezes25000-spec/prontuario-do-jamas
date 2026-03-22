import { Test, TestingModule } from '@nestjs/testing';
import { EncountersController } from './encounters.controller';
import { EncountersService } from './encounters.service';

describe('EncountersController', () => {
  let controller: EncountersController;
  let service: EncountersService;

  const tenantId = 'tenant-1';

  const mockEncounter = {
    id: 'enc-1',
    patientId: 'patient-1',
    status: 'IN_PROGRESS',
    tenantId,
  };

  const mockEncountersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findActive: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EncountersController],
      providers: [
        { provide: EncountersService, useValue: mockEncountersService },
      ],
    }).compile();

    controller = module.get<EncountersController>(EncountersController);
    service = module.get<EncountersService>(EncountersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an encounter', async () => {
      const dto = { patientId: 'patient-1', type: 'OUTPATIENT' };
      mockEncountersService.create.mockResolvedValue(mockEncounter);

      const result = await controller.create(tenantId, dto as never);

      expect(service.create).toHaveBeenCalledWith(tenantId, dto);
      expect(result).toEqual(mockEncounter);
    });

    it('should propagate errors from service', async () => {
      mockEncountersService.create.mockRejectedValue(new Error('Bad request'));

      await expect(controller.create(tenantId, {} as never)).rejects.toThrow('Bad request');
    });
  });

  describe('findAll', () => {
    it('should return paginated encounters', async () => {
      const query = { page: 1, pageSize: 10 };
      const expected = { data: [mockEncounter], total: 1 };
      mockEncountersService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(tenantId, query as never);

      expect(service.findAll).toHaveBeenCalledWith(tenantId, query);
      expect(result).toEqual(expected);
    });
  });

  describe('findActive', () => {
    it('should return active encounters', async () => {
      const active = [mockEncounter];
      mockEncountersService.findActive.mockResolvedValue(active);

      const result = await controller.findActive(tenantId);

      expect(service.findActive).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual(active);
    });
  });

  describe('findById', () => {
    it('should return encounter by ID', async () => {
      mockEncountersService.findById.mockResolvedValue(mockEncounter);

      const result = await controller.findById('enc-1', tenantId);

      expect(service.findById).toHaveBeenCalledWith('enc-1', tenantId);
      expect(result).toEqual(mockEncounter);
    });

    it('should propagate not found error', async () => {
      mockEncountersService.findById.mockRejectedValue(new Error('Not found'));

      await expect(controller.findById('missing', tenantId)).rejects.toThrow('Not found');
    });
  });

  describe('update', () => {
    it('should update encounter', async () => {
      const dto = { chiefComplaint: 'Headache' };
      const updated = { ...mockEncounter, chiefComplaint: 'Headache' };
      mockEncountersService.update.mockResolvedValue(updated);

      const result = await controller.update('enc-1', tenantId, dto as never);

      expect(service.update).toHaveBeenCalledWith('enc-1', tenantId, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('updateStatus', () => {
    it('should update encounter status', async () => {
      const updated = { ...mockEncounter, status: 'COMPLETED' };
      mockEncountersService.updateStatus.mockResolvedValue(updated);

      const result = await controller.updateStatus('enc-1', tenantId, 'COMPLETED' as never);

      expect(service.updateStatus).toHaveBeenCalledWith('enc-1', tenantId, 'COMPLETED');
      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('delete', () => {
    it('should delete encounter', async () => {
      mockEncountersService.delete.mockResolvedValue({ deleted: true });

      const result = await controller.delete('enc-1', tenantId);

      expect(service.delete).toHaveBeenCalledWith('enc-1', tenantId);
      expect(result).toEqual({ deleted: true });
    });
  });
});
