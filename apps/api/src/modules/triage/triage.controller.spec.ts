import { Test, TestingModule } from '@nestjs/testing';
import { TriageController } from './triage.controller';
import { TriageService } from './triage.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

describe('TriageController', () => {
  let controller: TriageController;
  let service: TriageService;

  const mockUser: JwtPayload = {
    sub: 'user-1',
    email: 'nurse@voxpep.com',
    role: 'NURSE',
    tenantId: 'tenant-1',
  };

  const tenantId = 'tenant-1';

  const mockTriage = {
    id: 'triage-1',
    encounterId: 'enc-1',
    level: 'YELLOW',
    chiefComplaint: 'Dor de cabeça',
  };

  const mockTriageService = {
    create: jest.fn(),
    getWaitingQueue: jest.fn(),
    findByEncounter: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TriageController],
      providers: [
        { provide: TriageService, useValue: mockTriageService },
      ],
    }).compile();

    controller = module.get<TriageController>(TriageController);
    service = module.get<TriageService>(TriageService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a triage assessment', async () => {
      const dto = { encounterId: 'enc-1', level: 'YELLOW', chiefComplaint: 'Dor de cabeça' };
      mockTriageService.create.mockResolvedValue(mockTriage);

      const result = await controller.create(mockUser, dto as never);

      expect(service.create).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual(mockTriage);
    });

    it('should propagate errors from service', async () => {
      mockTriageService.create.mockRejectedValue(new Error('Invalid data'));

      await expect(controller.create(mockUser, {} as never)).rejects.toThrow('Invalid data');
    });
  });

  describe('getWaitingQueue', () => {
    it('should return waiting queue sorted by triage level', async () => {
      const queue = [mockTriage, { ...mockTriage, id: 'triage-2', level: 'RED' }];
      mockTriageService.getWaitingQueue.mockResolvedValue(queue);

      const result = await controller.getWaitingQueue(tenantId);

      expect(service.getWaitingQueue).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual(queue);
    });
  });

  describe('findByEncounter', () => {
    it('should return triage assessment for an encounter', async () => {
      mockTriageService.findByEncounter.mockResolvedValue(mockTriage);

      const result = await controller.findByEncounter('enc-1');

      expect(service.findByEncounter).toHaveBeenCalledWith('enc-1');
      expect(result).toEqual(mockTriage);
    });

    it('should propagate not found error', async () => {
      mockTriageService.findByEncounter.mockRejectedValue(new Error('Not found'));

      await expect(controller.findByEncounter('missing')).rejects.toThrow('Not found');
    });
  });

  describe('update', () => {
    it('should update triage assessment', async () => {
      const dto = { level: 'RED', chiefComplaint: 'Dor torácica' };
      const updated = { ...mockTriage, level: 'RED', chiefComplaint: 'Dor torácica' };
      mockTriageService.update.mockResolvedValue(updated);

      const result = await controller.update('enc-1', dto as never);

      expect(service.update).toHaveBeenCalledWith('enc-1', dto);
      expect(result.level).toBe('RED');
    });
  });
});
