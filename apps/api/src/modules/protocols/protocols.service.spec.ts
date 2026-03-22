import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProtocolsService } from './protocols.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProtocolsService', () => {
  let service: ProtocolsService;

  const mockProtocol = {
    id: 'proto-1',
    tenantId: 'tenant-1',
    name: 'Protocolo Sepse',
    nameEn: 'Sepsis Protocol',
    description: 'Early sepsis detection and treatment',
    category: 'SEPSIS',
    triggerCriteria: [
      { field: 'temperature', operator: 'gte', value: 38.3 },
      { field: 'heartRate', operator: 'gte', value: 90 },
    ],
    actions: [
      { type: 'ALERT', params: { message: 'Possible sepsis' } },
      { type: 'ORDER', params: { lab: 'lactate' } },
    ],
    priority: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    clinicalProtocol: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProtocolsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProtocolsService>(ProtocolsService);
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  describe('createProtocol', () => {
    it('should create a clinical protocol', async () => {
      mockPrismaService.clinicalProtocol.create.mockResolvedValue(mockProtocol);

      const dto = {
        name: 'Protocolo Sepse',
        nameEn: 'Sepsis Protocol',
        description: 'Early sepsis detection and treatment',
        category: 'SEPSIS',
        triggerCriteria: [
          { field: 'temperature', operator: 'gte' as const, value: 38.3 },
        ],
        actions: [{ type: 'ALERT', params: { message: 'Possible sepsis' } }],
        priority: 10,
      };

      const result = await service.createProtocol('tenant-1', dto as any);

      expect(result).toEqual(mockProtocol);
      expect(mockPrismaService.clinicalProtocol.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          name: 'Protocolo Sepse',
          category: 'SEPSIS',
        }),
      });
    });

    it('should default isActive to true and priority to 0', async () => {
      mockPrismaService.clinicalProtocol.create.mockResolvedValue(mockProtocol);

      const dto = {
        name: 'Test',
        description: 'Test',
        category: 'PAIN',
        triggerCriteria: [],
        actions: [],
      };

      await service.createProtocol('tenant-1', dto as any);

      expect(mockPrismaService.clinicalProtocol.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isActive: true,
          priority: 0,
        }),
      });
    });
  });

  describe('findProtocols', () => {
    it('should return all protocols for a tenant', async () => {
      mockPrismaService.clinicalProtocol.findMany.mockResolvedValue([mockProtocol]);

      const result = await service.findProtocols('tenant-1');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.clinicalProtocol.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      });
    });

    it('should filter by category', async () => {
      mockPrismaService.clinicalProtocol.findMany.mockResolvedValue([mockProtocol]);

      await service.findProtocols('tenant-1', { category: 'SEPSIS' });

      expect(mockPrismaService.clinicalProtocol.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', category: 'SEPSIS' },
        orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      });
    });

    it('should filter by isActive', async () => {
      mockPrismaService.clinicalProtocol.findMany.mockResolvedValue([]);

      await service.findProtocols('tenant-1', { isActive: false });

      expect(mockPrismaService.clinicalProtocol.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', isActive: false },
        orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      });
    });
  });

  describe('findProtocolById', () => {
    it('should return protocol when found', async () => {
      mockPrismaService.clinicalProtocol.findFirst.mockResolvedValue(mockProtocol);

      const result = await service.findProtocolById('tenant-1', 'proto-1');

      expect(result.id).toBe('proto-1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.clinicalProtocol.findFirst.mockResolvedValue(null);

      await expect(
        service.findProtocolById('tenant-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProtocol', () => {
    it('should update protocol fields', async () => {
      mockPrismaService.clinicalProtocol.findFirst.mockResolvedValue(mockProtocol);
      mockPrismaService.clinicalProtocol.update.mockResolvedValue({
        ...mockProtocol,
        name: 'Updated Name',
      });

      const result = await service.updateProtocol('tenant-1', 'proto-1', {
        name: 'Updated Name',
      } as any);

      expect(result.name).toBe('Updated Name');
      expect(mockPrismaService.clinicalProtocol.update).toHaveBeenCalledWith({
        where: { id: 'proto-1' },
        data: { name: 'Updated Name' },
      });
    });

    it('should throw NotFoundException when protocol does not exist', async () => {
      mockPrismaService.clinicalProtocol.findFirst.mockResolvedValue(null);

      await expect(
        service.updateProtocol('tenant-1', 'nonexistent', { name: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleProtocol', () => {
    it('should toggle isActive from true to false', async () => {
      mockPrismaService.clinicalProtocol.findFirst.mockResolvedValue(mockProtocol);
      mockPrismaService.clinicalProtocol.update.mockResolvedValue({
        ...mockProtocol,
        isActive: false,
      });

      const result = await service.toggleProtocol('tenant-1', 'proto-1');

      expect(result.isActive).toBe(false);
      expect(mockPrismaService.clinicalProtocol.update).toHaveBeenCalledWith({
        where: { id: 'proto-1' },
        data: { isActive: false },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // evaluateTriggers
  // ---------------------------------------------------------------------------

  describe('evaluateTriggers', () => {
    it('should match protocol when ALL criteria are satisfied (gte operator)', async () => {
      mockPrismaService.clinicalProtocol.findMany.mockResolvedValue([mockProtocol]);

      const result = await service.evaluateTriggers('tenant-1', {
        temperature: 39.0,
        heartRate: 110,
      });

      expect(result.matchedProtocols).toHaveLength(1);
      expect(result.matchedProtocols[0].protocol.id).toBe('proto-1');
      expect(result.matchedProtocols[0].matchedCriteria).toHaveLength(2);
    });

    it('should NOT match when only some criteria are satisfied', async () => {
      mockPrismaService.clinicalProtocol.findMany.mockResolvedValue([mockProtocol]);

      const result = await service.evaluateTriggers('tenant-1', {
        temperature: 39.0,
        heartRate: 60, // below threshold of 90
      });

      expect(result.matchedProtocols).toHaveLength(0);
    });

    it('should handle "eq" operator', async () => {
      const eqProtocol = {
        ...mockProtocol,
        id: 'proto-eq',
        triggerCriteria: [{ field: 'triageLevel', operator: 'eq', value: 'RED' }],
        actions: [{ type: 'ALERT', params: { message: 'Critical triage' } }],
      };
      mockPrismaService.clinicalProtocol.findMany.mockResolvedValue([eqProtocol]);

      const match = await service.evaluateTriggers('tenant-1', { triageLevel: 'RED' });
      expect(match.matchedProtocols).toHaveLength(1);

      mockPrismaService.clinicalProtocol.findMany.mockResolvedValue([eqProtocol]);
      const noMatch = await service.evaluateTriggers('tenant-1', { triageLevel: 'GREEN' });
      expect(noMatch.matchedProtocols).toHaveLength(0);
    });

    it('should handle "lt" operator', async () => {
      const ltProtocol = {
        ...mockProtocol,
        id: 'proto-lt',
        triggerCriteria: [{ field: 'oxygenSaturation', operator: 'lt', value: 90 }],
        actions: [],
      };
      mockPrismaService.clinicalProtocol.findMany.mockResolvedValue([ltProtocol]);

      const match = await service.evaluateTriggers('tenant-1', { oxygenSaturation: 85 });
      expect(match.matchedProtocols).toHaveLength(1);

      mockPrismaService.clinicalProtocol.findMany.mockResolvedValue([ltProtocol]);
      const noMatch = await service.evaluateTriggers('tenant-1', { oxygenSaturation: 95 });
      expect(noMatch.matchedProtocols).toHaveLength(0);
    });

    it('should handle "contains" operator (case-insensitive)', async () => {
      const containsProtocol = {
        ...mockProtocol,
        id: 'proto-contains',
        triggerCriteria: [{ field: 'chiefComplaint', operator: 'contains', value: 'chest pain' }],
        actions: [{ type: 'ALERT', params: {} }],
      };
      mockPrismaService.clinicalProtocol.findMany.mockResolvedValue([containsProtocol]);

      const match = await service.evaluateTriggers('tenant-1', {
        chiefComplaint: 'Patient reports Chest Pain and shortness of breath',
      });
      expect(match.matchedProtocols).toHaveLength(1);
    });

    it('should handle "in" operator', async () => {
      const inProtocol = {
        ...mockProtocol,
        id: 'proto-in',
        triggerCriteria: [{ field: 'triageLevel', operator: 'in', value: ['RED', 'ORANGE'] }],
        actions: [],
      };
      mockPrismaService.clinicalProtocol.findMany.mockResolvedValue([inProtocol]);

      const match = await service.evaluateTriggers('tenant-1', { triageLevel: 'RED' });
      expect(match.matchedProtocols).toHaveLength(1);

      mockPrismaService.clinicalProtocol.findMany.mockResolvedValue([inProtocol]);
      const noMatch = await service.evaluateTriggers('tenant-1', { triageLevel: 'GREEN' });
      expect(noMatch.matchedProtocols).toHaveLength(0);
    });

    it('should skip protocols with empty or non-array triggerCriteria', async () => {
      const emptyProtocol = {
        ...mockProtocol,
        id: 'proto-empty',
        triggerCriteria: [],
      };
      mockPrismaService.clinicalProtocol.findMany.mockResolvedValue([emptyProtocol]);

      const result = await service.evaluateTriggers('tenant-1', { temperature: 39 });

      expect(result.matchedProtocols).toHaveLength(0);
    });

    it('should skip criteria when field value is undefined/null', async () => {
      mockPrismaService.clinicalProtocol.findMany.mockResolvedValue([mockProtocol]);

      // Only temperature provided, heartRate missing from encounter data
      const result = await service.evaluateTriggers('tenant-1', {
        temperature: 39.0,
        // heartRate is missing
      });

      // Should not match because heartRate criterion can't be evaluated
      expect(result.matchedProtocols).toHaveLength(0);
    });

    it('should include recommendedActions from the matched protocol', async () => {
      mockPrismaService.clinicalProtocol.findMany.mockResolvedValue([mockProtocol]);

      const result = await service.evaluateTriggers('tenant-1', {
        temperature: 39.0,
        heartRate: 110,
      });

      expect(result.matchedProtocols[0].recommendedActions).toHaveLength(2);
      expect(result.matchedProtocols[0].recommendedActions[0].type).toBe('ALERT');
    });
  });
});
