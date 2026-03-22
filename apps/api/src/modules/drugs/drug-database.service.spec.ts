import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DrugDatabaseService } from './drug-database.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DrugDatabaseService', () => {
  let service: DrugDatabaseService;

  const mockDrug = {
    id: 'drug-1',
    name: 'Dipirona',
    activeIngredient: 'metamizole',
    therapeuticClass: 'Analgesic',
    isActive: true,
    isControlled: false,
    isAntimicrobial: false,
    isHighAlert: false,
    maxDosePerDay: '4000',
    beersListCriteria: null,
    pregnancyCategory: 'C',
    geriatricCaution: false,
    pediatricUse: true,
  };

  const mockDrug2 = {
    id: 'drug-2',
    name: 'Warfarin',
    activeIngredient: 'warfarin',
    therapeuticClass: 'Anticoagulant',
    isActive: true,
    isControlled: true,
    isAntimicrobial: false,
    isHighAlert: true,
    maxDosePerDay: '10',
    beersListCriteria: 'Increased risk of bleeding in elderly',
    pregnancyCategory: 'X',
    geriatricCaution: true,
    pediatricUse: false,
  };

  const mockPrismaService = {
    drug: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    drugInteraction: {
      findMany: jest.fn(),
    },
    allergy: {
      findMany: jest.fn(),
    },
    patient: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrugDatabaseService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DrugDatabaseService>(DrugDatabaseService);
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // searchDrugs
  // ---------------------------------------------------------------------------

  describe('searchDrugs', () => {
    it('should return paginated drug results', async () => {
      mockPrismaService.drug.findMany.mockResolvedValue([mockDrug]);
      mockPrismaService.drug.count.mockResolvedValue(1);

      const result = await service.searchDrugs('Dipirona');

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockPrismaService.drug.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should search without query and return all active drugs', async () => {
      mockPrismaService.drug.findMany.mockResolvedValue([mockDrug, mockDrug2]);
      mockPrismaService.drug.count.mockResolvedValue(2);

      const result = await service.searchDrugs();

      expect(result.data).toHaveLength(2);
      expect(mockPrismaService.drug.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('should apply filters for controlled substances', async () => {
      mockPrismaService.drug.findMany.mockResolvedValue([mockDrug2]);
      mockPrismaService.drug.count.mockResolvedValue(1);

      await service.searchDrugs(undefined, { isControlled: true });

      expect(mockPrismaService.drug.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            isControlled: true,
          }),
        }),
      );
    });

    it('should paginate correctly', async () => {
      mockPrismaService.drug.findMany.mockResolvedValue([]);
      mockPrismaService.drug.count.mockResolvedValue(50);

      const result = await service.searchDrugs(undefined, undefined, 3, 10);

      expect(result.meta.page).toBe(3);
      expect(result.meta.totalPages).toBe(5);
      expect(mockPrismaService.drug.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findDrugById
  // ---------------------------------------------------------------------------

  describe('findDrugById', () => {
    it('should return a drug with normalized interactions', async () => {
      mockPrismaService.drug.findUnique.mockResolvedValue({
        ...mockDrug,
        interactionsAs1: [
          {
            id: 'int-1',
            drug2: { id: 'drug-2', name: 'Warfarin', activeIngredient: 'warfarin' },
            severity: 'SEVERE',
            effect: 'Bleeding risk',
            management: 'Avoid combination',
            mechanism: 'CYP inhibition',
            evidence: 'High',
          },
        ],
        interactionsAs2: [],
      });

      const result = await service.findDrugById('drug-1');

      expect(result.id).toBe('drug-1');
      expect(result.interactions).toHaveLength(1);
      expect(result.interactions[0].otherDrug.name).toBe('Warfarin');
    });

    it('should throw NotFoundException when drug not found', async () => {
      mockPrismaService.drug.findUnique.mockResolvedValue(null);

      await expect(service.findDrugById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // checkInteractions
  // ---------------------------------------------------------------------------

  describe('checkInteractions', () => {
    it('should return empty result when fewer than 2 drug IDs', async () => {
      const result = await service.checkInteractions(['drug-1']);

      expect(result.interactions).toHaveLength(0);
      expect(result.hasSevere).toBe(false);
      expect(mockPrismaService.drugInteraction.findMany).not.toHaveBeenCalled();
    });

    it('should find pairwise interactions between drugs', async () => {
      mockPrismaService.drugInteraction.findMany.mockResolvedValue([
        {
          id: 'int-1',
          drug1: { id: 'drug-1', name: 'Dipirona', activeIngredient: 'metamizole' },
          drug2: { id: 'drug-2', name: 'Warfarin', activeIngredient: 'warfarin' },
          severity: 'MODERATE',
          effect: 'Increased anticoagulant effect',
          management: 'Monitor INR',
          mechanism: 'Protein binding displacement',
          evidence: 'Moderate',
        },
      ]);

      const result = await service.checkInteractions(['drug-1', 'drug-2']);

      expect(result.interactions).toHaveLength(1);
      expect(result.hasSevere).toBe(false);
    });

    it('should flag hasSevere when a SEVERE interaction is found', async () => {
      mockPrismaService.drugInteraction.findMany.mockResolvedValue([
        {
          id: 'int-1',
          drug1: { id: 'drug-1', name: 'A', activeIngredient: 'a' },
          drug2: { id: 'drug-2', name: 'B', activeIngredient: 'b' },
          severity: 'SEVERE',
          effect: 'Fatal arrhythmia',
          management: 'Contraindicated',
          mechanism: 'QT prolongation',
          evidence: 'High',
        },
      ]);

      const result = await service.checkInteractions(['drug-1', 'drug-2']);

      expect(result.hasSevere).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // checkAllergyConflict
  // ---------------------------------------------------------------------------

  describe('checkAllergyConflict', () => {
    it('should detect conflict when allergy matches active ingredient', async () => {
      mockPrismaService.drug.findUnique.mockResolvedValue({
        activeIngredient: 'metamizole',
        name: 'Dipirona',
      });
      mockPrismaService.allergy.findMany.mockResolvedValue([
        { id: 'allergy-1', substance: 'Metamizole', severity: 'SEVERE', reaction: 'Anaphylaxis' },
      ]);

      const result = await service.checkAllergyConflict('drug-1', 'patient-1');

      expect(result.hasConflict).toBe(true);
      expect(result.matchedAllergies).toHaveLength(1);
    });

    it('should return no conflict when allergy does not match', async () => {
      mockPrismaService.drug.findUnique.mockResolvedValue({
        activeIngredient: 'metamizole',
        name: 'Dipirona',
      });
      mockPrismaService.allergy.findMany.mockResolvedValue([
        { id: 'allergy-2', substance: 'Penicillin', severity: 'MODERATE', reaction: 'Rash' },
      ]);

      const result = await service.checkAllergyConflict('drug-1', 'patient-1');

      expect(result.hasConflict).toBe(false);
      expect(result.matchedAllergies).toHaveLength(0);
    });

    it('should throw NotFoundException when drug not found', async () => {
      mockPrismaService.drug.findUnique.mockResolvedValue(null);

      await expect(
        service.checkAllergyConflict('nonexistent', 'patient-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // checkBeersListCriteria
  // ---------------------------------------------------------------------------

  describe('checkBeersListCriteria', () => {
    it('should return positive when drug is on Beers list and patient >= 65', async () => {
      mockPrismaService.drug.findUnique.mockResolvedValue({
        name: 'Warfarin',
        beersListCriteria: 'Increased risk of bleeding in elderly',
      });

      const result = await service.checkBeersListCriteria('drug-2', 70);

      expect(result.isOnBeersList).toBe(true);
      expect(result.criteria).toBe('Increased risk of bleeding in elderly');
    });

    it('should return negative when patient is under 65', async () => {
      mockPrismaService.drug.findUnique.mockResolvedValue({
        name: 'Warfarin',
        beersListCriteria: 'Increased risk of bleeding in elderly',
      });

      const result = await service.checkBeersListCriteria('drug-2', 50);

      expect(result.isOnBeersList).toBe(false);
      expect(result.criteria).toBeNull();
    });

    it('should return negative when drug has no Beers criteria', async () => {
      mockPrismaService.drug.findUnique.mockResolvedValue({
        name: 'Dipirona',
        beersListCriteria: null,
      });

      const result = await service.checkBeersListCriteria('drug-1', 70);

      expect(result.isOnBeersList).toBe(false);
    });

    it('should throw NotFoundException when drug not found', async () => {
      mockPrismaService.drug.findUnique.mockResolvedValue(null);

      await expect(
        service.checkBeersListCriteria('nonexistent', 70),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // checkPregnancyCategory
  // ---------------------------------------------------------------------------

  describe('checkPregnancyCategory', () => {
    it('should return safe for category A or B', async () => {
      mockPrismaService.drug.findUnique.mockResolvedValue({
        name: 'SafeDrug',
        pregnancyCategory: 'B',
      });

      const result = await service.checkPregnancyCategory('drug-safe');

      expect(result.isSafe).toBe(true);
      expect(result.category).toBe('B');
    });

    it('should return unsafe for category X', async () => {
      mockPrismaService.drug.findUnique.mockResolvedValue({
        name: 'Warfarin',
        pregnancyCategory: 'X',
      });

      const result = await service.checkPregnancyCategory('drug-2');

      expect(result.isSafe).toBe(false);
      expect(result.category).toBe('X');
      expect(result.warning).toContain('CONTRAINDICADO');
    });

    it('should handle null pregnancy category', async () => {
      mockPrismaService.drug.findUnique.mockResolvedValue({
        name: 'UnclassifiedDrug',
        pregnancyCategory: null,
      });

      const result = await service.checkPregnancyCategory('drug-x');

      expect(result.isSafe).toBe(false);
      expect(result.category).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // checkDoseLimits
  // ---------------------------------------------------------------------------

  describe('checkDoseLimits', () => {
    it('should detect dose exceeding max daily limit', async () => {
      mockPrismaService.drug.findUnique.mockResolvedValue({
        name: 'Dipirona',
        maxDosePerDay: '4000',
        isHighAlert: false,
        geriatricCaution: false,
        pediatricUse: true,
      });

      // 1000mg x 6/6h = 4 times/day = 4000mg -> not exceeding
      const resultOk = await service.checkDoseLimits('drug-1', 1000, 'mg', '6/6h');
      expect(resultOk.withinLimits).toBe(true);

      // 1500mg x 6/6h = 4 times/day = 6000mg -> exceeds 4000
      mockPrismaService.drug.findUnique.mockResolvedValue({
        name: 'Dipirona',
        maxDosePerDay: '4000',
        isHighAlert: false,
        geriatricCaution: false,
        pediatricUse: true,
      });
      const resultBad = await service.checkDoseLimits('drug-1', 1500, 'mg', '6/6h');
      expect(resultBad.withinLimits).toBe(false);
      expect(resultBad.warnings.length).toBeGreaterThan(0);
    });

    it('should warn for high-alert drugs', async () => {
      mockPrismaService.drug.findUnique.mockResolvedValue({
        name: 'Warfarin',
        maxDosePerDay: '10',
        isHighAlert: true,
        geriatricCaution: true,
        pediatricUse: false,
      });

      const result = await service.checkDoseLimits('drug-2', 5, 'mg', '1x/dia');

      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('ALTO ALERTA'),
        ]),
      );
    });

    it('should warn for geriatric patients', async () => {
      mockPrismaService.drug.findUnique.mockResolvedValue({
        name: 'Warfarin',
        maxDosePerDay: '10',
        isHighAlert: false,
        geriatricCaution: true,
        pediatricUse: true,
      });

      const result = await service.checkDoseLimits(
        'drug-2', 5, 'mg', '1x/dia', undefined, 70,
      );

      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('idoso'),
        ]),
      );
    });

    it('should throw NotFoundException when drug not found', async () => {
      mockPrismaService.drug.findUnique.mockResolvedValue(null);

      await expect(
        service.checkDoseLimits('nonexistent', 500, 'mg', '8/8h'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
