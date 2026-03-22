import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TriageService } from './triage.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TriageService', () => {
  let service: TriageService;
  let prisma: any;

  const mockTriage = {
    id: 'triage-1',
    encounterId: 'enc-1',
    nurseId: 'nurse-1',
    protocol: 'MANCHESTER',
    chiefComplaint: 'Chest pain',
    level: 'RED',
    completedAt: new Date(),
    createdAt: new Date(),
  };

  const mockTx = {
    triageAssessment: {
      create: jest.fn(),
    },
    encounter: {
      update: jest.fn(),
    },
  };

  const mockPrisma = {
    $transaction: jest.fn((fn: any) => fn(mockTx)),
    triageAssessment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    encounter: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriageService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TriageService>(TriageService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create triage assessment and update encounter', async () => {
      const dto = {
        encounterId: 'enc-1',
        chiefComplaint: 'Chest pain',
        level: 'RED',
        maxWaitTimeMinutes: 0,
      };

      mockTx.triageAssessment.create.mockResolvedValue(mockTriage);
      mockTx.encounter.update.mockResolvedValue({});

      const result = await service.create('nurse-1', dto as any);

      expect(result).toEqual(mockTriage);
      expect(mockTx.triageAssessment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          encounterId: 'enc-1',
          nurseId: 'nurse-1',
          level: 'RED',
          protocol: 'MANCHESTER',
          completedAt: expect.any(Date),
        }),
      });
      expect(mockTx.encounter.update).toHaveBeenCalledWith({
        where: { id: 'enc-1' },
        data: expect.objectContaining({
          triageLevel: 'RED',
          status: 'WAITING',
        }),
      });
    });
  });

  describe('findByEncounter', () => {
    it('should return triage with nurse and vital signs', async () => {
      prisma.triageAssessment.findUnique.mockResolvedValue(mockTriage);

      const result = await service.findByEncounter('enc-1');

      expect(result).toEqual(mockTriage);
      expect(prisma.triageAssessment.findUnique).toHaveBeenCalledWith({
        where: { encounterId: 'enc-1' },
        include: {
          nurse: { select: { id: true, name: true } },
          vitalSigns: true,
        },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.triageAssessment.findUnique.mockResolvedValue(null);

      await expect(service.findByEncounter('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update triage level and encounter', async () => {
      const existing = { ...mockTriage, level: 'YELLOW' };
      prisma.triageAssessment.findUnique.mockResolvedValue(existing);
      prisma.encounter.update.mockResolvedValue({});
      prisma.triageAssessment.update.mockResolvedValue({
        ...existing,
        level: 'RED',
        overriddenByNurse: true,
      });

      await service.update('enc-1', { level: 'RED' } as any);

      expect(prisma.encounter.update).toHaveBeenCalledWith({
        where: { id: 'enc-1' },
        data: { triageLevel: 'RED' },
      });
      expect(prisma.triageAssessment.update).toHaveBeenCalledWith({
        where: { encounterId: 'enc-1' },
        data: expect.objectContaining({
          level: 'RED',
          overriddenByNurse: true,
        }),
      });
    });

    it('should throw NotFoundException if triage not found', async () => {
      prisma.triageAssessment.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { level: 'RED' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWaitingQueue', () => {
    it('should return encounters sorted by triage level then time', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 60000);

      const encounters = [
        {
          id: 'enc-3',
          triageLevel: 'YELLOW',
          createdAt: earlier,
          triageAssessment: {},
        },
        {
          id: 'enc-1',
          triageLevel: 'RED',
          createdAt: now,
          triageAssessment: {},
        },
        {
          id: 'enc-2',
          triageLevel: 'GREEN',
          createdAt: earlier,
          triageAssessment: {},
        },
      ];

      prisma.encounter.findMany.mockResolvedValue(encounters);

      const result = await service.getWaitingQueue('tenant-1');

      expect(result[0].triageLevel).toBe('RED');
      expect(result[1].triageLevel).toBe('YELLOW');
      expect(result[2].triageLevel).toBe('GREEN');
    });

    it('should sort RED patients first in queue', async () => {
      const now = new Date();
      const encounters = [
        {
          id: 'enc-1',
          triageLevel: 'GREEN',
          createdAt: new Date(now.getTime() - 120000),
          triageAssessment: {},
        },
        {
          id: 'enc-2',
          triageLevel: 'RED',
          createdAt: now,
          triageAssessment: {},
        },
      ];

      prisma.encounter.findMany.mockResolvedValue(encounters);

      const result = await service.getWaitingQueue('tenant-1');

      expect(result[0].id).toBe('enc-2');
      expect(result[0].triageLevel).toBe('RED');
    });
  });
});
