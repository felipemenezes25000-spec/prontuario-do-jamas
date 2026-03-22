import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ChemotherapyService } from './chemotherapy.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ChemotherapyService', () => {
  let service: ChemotherapyService;

  const mockProtocol = {
    id: 'proto-1',
    tenantId: 'tenant-1',
    name: 'FOLFOX',
    nameEn: 'FOLFOX',
    regimen: 'FOLFOX6',
    indication: 'Colorectal cancer',
    drugs: [
      { name: 'Oxaliplatin', dose: 85, unit: 'mg/m2', route: 'IV', day: 1, infusionTime: '2h' },
      { name: '5-FU', dose: 400, unit: 'mg/m2', route: 'IV', day: 1, infusionTime: '46h' },
    ],
    premedications: [],
    cycleDays: 14,
    maxCycles: 12,
    emetogenicRisk: 'MODERATE',
    notes: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCycle = {
    id: 'cycle-1',
    tenantId: 'tenant-1',
    patientId: 'patient-1',
    encounterId: 'enc-1',
    protocolId: 'proto-1',
    cycleNumber: 1,
    scheduledDate: new Date('2026-04-01'),
    weight: 70,
    height: 175,
    bsa: 1.8476,
    adjustedDoses: [],
    status: 'SCHEDULED',
    nurseNotes: null,
    doctorNotes: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    protocol: { id: 'proto-1', name: 'FOLFOX', regimen: 'FOLFOX6' },
    patient: { id: 'patient-1', fullName: 'Maria Silva', mrn: 'MRN-0001' },
  };

  const mockPrismaService = {
    chemotherapyProtocol: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    chemotherapyCycle: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChemotherapyService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ChemotherapyService>(ChemotherapyService);
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // BSA Calculation
  // ---------------------------------------------------------------------------

  describe('calculateBSA (static)', () => {
    it('should calculate BSA using the DuBois formula', () => {
      // 70 kg, 175 cm -> expected ~1.8476 m^2
      const bsa = ChemotherapyService.calculateBSA(70, 175);
      expect(bsa).toBeCloseTo(1.8476, 2);
    });

    it('should return a higher BSA for a larger patient', () => {
      const small = ChemotherapyService.calculateBSA(50, 150);
      const large = ChemotherapyService.calculateBSA(100, 190);
      expect(large).toBeGreaterThan(small);
    });

    it('should throw BadRequestException when weight is zero or negative', () => {
      expect(() => ChemotherapyService.calculateBSA(0, 175)).toThrow(
        BadRequestException,
      );
      expect(() => ChemotherapyService.calculateBSA(-5, 175)).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when height is zero or negative', () => {
      expect(() => ChemotherapyService.calculateBSA(70, 0)).toThrow(
        BadRequestException,
      );
      expect(() => ChemotherapyService.calculateBSA(70, -10)).toThrow(
        BadRequestException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Protocols
  // ---------------------------------------------------------------------------

  describe('createProtocol', () => {
    it('should create a chemotherapy protocol', async () => {
      const dto = {
        name: 'FOLFOX',
        nameEn: 'FOLFOX',
        regimen: 'FOLFOX6',
        indication: 'Colorectal cancer',
        drugs: [{ name: 'Oxaliplatin', dose: 85, unit: 'mg/m2' }],
        cycleDays: 14,
        maxCycles: 12,
        emetogenicRisk: 'MODERATE',
      };

      mockPrismaService.chemotherapyProtocol.create.mockResolvedValue(mockProtocol);

      const result = await service.createProtocol('tenant-1', dto as any);

      expect(result).toEqual(mockProtocol);
      expect(mockPrismaService.chemotherapyProtocol.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          name: 'FOLFOX',
          regimen: 'FOLFOX6',
        }),
      });
    });

    it('should default isActive to true when not provided', async () => {
      const dto = {
        name: 'AC-T',
        regimen: 'AC-T',
        indication: 'Breast cancer',
        drugs: [],
        cycleDays: 21,
        maxCycles: 8,
      };

      mockPrismaService.chemotherapyProtocol.create.mockResolvedValue(mockProtocol);

      await service.createProtocol('tenant-1', dto as any);

      expect(mockPrismaService.chemotherapyProtocol.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isActive: true,
        }),
      });
    });
  });

  describe('findProtocols', () => {
    it('should return paginated protocols', async () => {
      mockPrismaService.chemotherapyProtocol.findMany.mockResolvedValue([mockProtocol]);
      mockPrismaService.chemotherapyProtocol.count.mockResolvedValue(1);

      const pagination = { page: 1, pageSize: 20, skip: 0, take: 20 };
      const result = await service.findProtocols('tenant-1', pagination as any);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('findProtocolById', () => {
    it('should return the protocol when found', async () => {
      mockPrismaService.chemotherapyProtocol.findFirst.mockResolvedValue(mockProtocol);

      const result = await service.findProtocolById('tenant-1', 'proto-1');

      expect(result.id).toBe('proto-1');
    });

    it('should throw NotFoundException when protocol not found', async () => {
      mockPrismaService.chemotherapyProtocol.findFirst.mockResolvedValue(null);

      await expect(
        service.findProtocolById('tenant-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // Cycles
  // ---------------------------------------------------------------------------

  describe('createCycle', () => {
    it('should create a cycle with BSA and adjusted doses when weight/height provided', async () => {
      mockPrismaService.chemotherapyProtocol.findFirst.mockResolvedValue(mockProtocol);
      mockPrismaService.chemotherapyCycle.create.mockResolvedValue(mockCycle);

      const dto = {
        patientId: 'patient-1',
        encounterId: 'enc-1',
        protocolId: 'proto-1',
        cycleNumber: 1,
        scheduledDate: '2026-04-01',
        weight: 70,
        height: 175,
      };

      const result = await service.createCycle('tenant-1', dto as any);

      expect(result).toEqual(mockCycle);
      expect(mockPrismaService.chemotherapyCycle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            patientId: 'patient-1',
            bsa: expect.any(Number),
            adjustedDoses: expect.any(Array),
          }),
        }),
      );
    });

    it('should throw NotFoundException when protocol does not exist', async () => {
      mockPrismaService.chemotherapyProtocol.findFirst.mockResolvedValue(null);

      const dto = {
        patientId: 'patient-1',
        protocolId: 'nonexistent',
        cycleNumber: 1,
        scheduledDate: '2026-04-01',
      };

      await expect(service.createCycle('tenant-1', dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when cycle number exceeds maxCycles', async () => {
      mockPrismaService.chemotherapyProtocol.findFirst.mockResolvedValue(mockProtocol);

      const dto = {
        patientId: 'patient-1',
        protocolId: 'proto-1',
        cycleNumber: 99, // exceeds maxCycles = 12
        scheduledDate: '2026-04-01',
      };

      await expect(service.createCycle('tenant-1', dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findCyclesByPatient', () => {
    it('should return cycles for a patient', async () => {
      mockPrismaService.chemotherapyCycle.findMany.mockResolvedValue([mockCycle]);

      const result = await service.findCyclesByPatient('tenant-1', 'patient-1');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.chemotherapyCycle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1', patientId: 'patient-1' },
        }),
      );
    });
  });

  describe('updateCycleStatus', () => {
    it('should update status to IN_PROGRESS and set startedAt', async () => {
      mockPrismaService.chemotherapyCycle.findFirst.mockResolvedValue(mockCycle);
      mockPrismaService.chemotherapyCycle.update.mockResolvedValue({
        ...mockCycle,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      });

      const result = await service.updateCycleStatus('tenant-1', 'cycle-1', {
        status: 'IN_PROGRESS' as any,
      });

      expect(mockPrismaService.chemotherapyCycle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
            startedAt: expect.any(Date),
          }),
        }),
      );
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('should update status to COMPLETED and set completedAt', async () => {
      mockPrismaService.chemotherapyCycle.findFirst.mockResolvedValue(mockCycle);
      mockPrismaService.chemotherapyCycle.update.mockResolvedValue({
        ...mockCycle,
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      await service.updateCycleStatus('tenant-1', 'cycle-1', {
        status: 'COMPLETED' as any,
      });

      expect(mockPrismaService.chemotherapyCycle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            completedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException when cycle not found', async () => {
      mockPrismaService.chemotherapyCycle.findFirst.mockResolvedValue(null);

      await expect(
        service.updateCycleStatus('tenant-1', 'nonexistent', {
          status: 'IN_PROGRESS' as any,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include toxicities and labResults when provided', async () => {
      mockPrismaService.chemotherapyCycle.findFirst.mockResolvedValue(mockCycle);
      mockPrismaService.chemotherapyCycle.update.mockResolvedValue(mockCycle);

      const toxicities = [{ type: 'Nausea', grade: 2, description: 'Moderate' }];
      const labResults = [{ name: 'WBC', value: 3.2, unit: '10^3/uL' }];

      await service.updateCycleStatus('tenant-1', 'cycle-1', {
        status: 'IN_PROGRESS' as any,
        toxicities,
        labResults,
      });

      expect(mockPrismaService.chemotherapyCycle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            toxicities,
            labResults,
          }),
        }),
      );
    });
  });
});
