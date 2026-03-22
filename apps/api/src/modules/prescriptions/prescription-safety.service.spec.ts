import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrescriptionSafetyService } from './prescription-safety.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MedicationRoute } from '@prisma/client';

describe('PrescriptionSafetyService', () => {
  let service: PrescriptionSafetyService;
  let prisma: PrismaService;

  const mockPrisma = {
    prescription: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    medicationCheck: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionSafetyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PrescriptionSafetyService>(PrescriptionSafetyService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Portaria 344/98 — Controlled Substance Validation
  // ──────────────────────────────────────────────────────────────────────────

  describe('validateControlledSubstance', () => {
    it('should return valid for non-controlled substances', () => {
      const result = service.validateControlledSubstance({
        medicationName: 'Paracetamol',
        isControlled: false,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.requiredRecipeType).toBe('Receita Simples');
    });

    it('should flag A1 narcotic exceeding 30 days', () => {
      const result = service.validateControlledSubstance({
        medicationName: 'Morfina',
        isControlled: true,
        controlType: 'A1',
        durationDays: 45,
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('30 dias');
      expect(result.requiredRecipeType).toContain('Amarela');
    });

    it('should warn about A1 requiring yellow recipe', () => {
      const result = service.validateControlledSubstance({
        medicationName: 'Morfina',
        isControlled: true,
        controlType: 'A1',
        durationDays: 15,
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('amarela'))).toBe(true);
    });

    it('should flag B1 psychotropic exceeding 60 days', () => {
      const result = service.validateControlledSubstance({
        medicationName: 'Clonazepam',
        isControlled: true,
        controlType: 'B1',
        durationDays: 90,
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('60 dias');
      expect(result.requiredRecipeType).toContain('Azul');
    });

    it('should flag B2 anorexigen exceeding 30 days', () => {
      const result = service.validateControlledSubstance({
        medicationName: 'Sibutramina',
        isControlled: true,
        controlType: 'B2',
        durationDays: 45,
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('30 dias');
    });

    it('should require pregnancy test for C2 retinoid in fertile women', () => {
      const result = service.validateControlledSubstance({
        medicationName: 'Isotretinoína',
        isControlled: true,
        controlType: 'C2',
        durationDays: 30,
        patientGender: 'F',
        patientAge: 25,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('beta-HCG'))).toBe(true);
    });

    it('should not require pregnancy test for C2 in men', () => {
      const result = service.validateControlledSubstance({
        medicationName: 'Isotretinoína',
        isControlled: true,
        controlType: 'C2',
        durationDays: 30,
        patientGender: 'M',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about C1 requiring white special recipe', () => {
      const result = service.validateControlledSubstance({
        medicationName: 'Tramadol',
        isControlled: true,
        controlType: 'C1',
        durationDays: 30,
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes('Branca Especial'))).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // RDC 471/2021 — Antimicrobial Validation
  // ──────────────────────────────────────────────────────────────────────────

  describe('validateAntimicrobial', () => {
    it('should return valid for non-antimicrobials', () => {
      const result = service.validateAntimicrobial({
        medicationName: 'Paracetamol',
        isAntimicrobial: false,
      });
      expect(result.valid).toBe(true);
      expect(result.requiresCulture).toBe(false);
    });

    it('should warn when antimicrobial exceeds 14 days', () => {
      const result = service.validateAntimicrobial({
        medicationName: 'Amoxicilina',
        isAntimicrobial: true,
        durationDays: 21,
      });
      expect(result.warnings.some((w) => w.includes('14 dias'))).toBe(true);
    });

    it('should recommend culture for antimicrobials', () => {
      const result = service.validateAntimicrobial({
        medicationName: 'Ceftriaxona',
        isAntimicrobial: true,
        durationDays: 7,
      });
      expect(result.requiresCulture).toBe(true);
    });

    it('should warn when no duration is specified', () => {
      const result = service.validateAntimicrobial({
        medicationName: 'Azitromicina',
        isAntimicrobial: true,
      });
      expect(result.warnings.some((w) => w.includes('duração'))).toBe(true);
    });

    it('should warn when no indication is provided', () => {
      const result = service.validateAntimicrobial({
        medicationName: 'Ciprofloxacino',
        isAntimicrobial: true,
        durationDays: 7,
      });
      expect(result.warnings.some((w) => w.includes('indicação'))).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Automatic Scheduling (Aprazamento)
  // ──────────────────────────────────────────────────────────────────────────

  describe('generateSchedule', () => {
    it('should generate 3 times for 8/8h from 08:00', () => {
      const result = service.generateSchedule({
        frequency: '8/8h',
        startTime: '08:00',
      });
      expect(result.intervalHours).toBe(8);
      expect(result.times).toHaveLength(3);

      const hours = result.times.map((t) => t.getHours());
      expect(hours).toEqual([8, 16, 0]);
    });

    it('should generate 2 times for 12/12h from 06:00', () => {
      const result = service.generateSchedule({
        frequency: '12/12h',
        startTime: '06:00',
      });
      expect(result.intervalHours).toBe(12);
      expect(result.times).toHaveLength(2);
    });

    it('should generate 4 times for 6/6h from 00:00', () => {
      const result = service.generateSchedule({
        frequency: '6/6h',
        startTime: '00:00',
      });
      expect(result.intervalHours).toBe(6);
      expect(result.times).toHaveLength(4);
    });

    it('should generate 1 time for 1x/dia', () => {
      const result = service.generateSchedule({
        frequency: '1x/dia',
        startTime: '08:00',
      });
      expect(result.intervalHours).toBe(24);
      expect(result.times).toHaveLength(1);
    });

    it('should generate 2 times for 2x/dia', () => {
      const result = service.generateSchedule({
        frequency: '2x/dia',
        startTime: '08:00',
      });
      expect(result.intervalHours).toBe(12);
      expect(result.times).toHaveLength(2);
    });

    it('should generate 3 times for 3x/dia', () => {
      const result = service.generateSchedule({
        frequency: '3x/dia',
        startTime: '08:00',
      });
      expect(result.intervalHours).toBe(8);
      expect(result.times).toHaveLength(3);
    });

    it('should throw for invalid frequency', () => {
      expect(() =>
        service.generateSchedule({ frequency: 'abc', startTime: '08:00' }),
      ).toThrow(BadRequestException);
    });

    it('should throw for invalid start time', () => {
      expect(() =>
        service.generateSchedule({ frequency: '8/8h', startTime: '25:00' }),
      ).toThrow(BadRequestException);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Double-Check for High-Alert Medications
  // ──────────────────────────────────────────────────────────────────────────

  describe('requiresDoubleCheck', () => {
    it('should flag insulin as CRITICAL', () => {
      const result = service.requiresDoubleCheck({
        medicationName: 'Insulina NPH',
        route: MedicationRoute.SC,
      });
      expect(result.requiresDoubleCheck).toBe(true);
      expect(result.alertLevel).toBe('CRITICAL');
    });

    it('should flag heparin as CRITICAL', () => {
      const result = service.requiresDoubleCheck({
        medicationName: 'Heparina sódica',
        route: MedicationRoute.IV,
      });
      expect(result.requiresDoubleCheck).toBe(true);
      expect(result.alertLevel).toBe('CRITICAL');
    });

    it('should flag KCl as CRITICAL', () => {
      const result = service.requiresDoubleCheck({
        medicationName: 'Cloreto de potássio',
        concentration: '19.1%',
        route: MedicationRoute.IV,
      });
      expect(result.requiresDoubleCheck).toBe(true);
      expect(result.alertLevel).toBe('CRITICAL');
    });

    it('should flag NaCl > 0.9%', () => {
      const result = service.requiresDoubleCheck({
        medicationName: 'Cloreto de sódio',
        concentration: '3%',
        route: MedicationRoute.IV,
      });
      expect(result.requiresDoubleCheck).toBe(true);
    });

    it('should NOT flag NaCl 0.9%', () => {
      const result = service.requiresDoubleCheck({
        medicationName: 'Cloreto de sódio',
        concentration: '0.9%',
        route: MedicationRoute.IV,
      });
      expect(result.requiresDoubleCheck).toBe(false);
    });

    it('should flag norepinephrine as CRITICAL', () => {
      const result = service.requiresDoubleCheck({
        medicationName: 'Noradrenalina',
        route: MedicationRoute.IV,
      });
      expect(result.requiresDoubleCheck).toBe(true);
      expect(result.alertLevel).toBe('CRITICAL');
    });

    it('should NOT flag regular paracetamol', () => {
      const result = service.requiresDoubleCheck({
        medicationName: 'Paracetamol',
        route: MedicationRoute.VO,
      });
      expect(result.requiresDoubleCheck).toBe(false);
    });

    it('should flag propofol IV as CRITICAL', () => {
      const result = service.requiresDoubleCheck({
        medicationName: 'Propofol',
        route: MedicationRoute.IV,
      });
      expect(result.requiresDoubleCheck).toBe(true);
      expect(result.alertLevel).toBe('CRITICAL');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Combined Safety Validation
  // ──────────────────────────────────────────────────────────────────────────

  describe('validateSafety', () => {
    it('should combine controlled + antimicrobial + double-check', () => {
      const result = service.validateSafety({
        medicationName: 'Morfina',
        isControlled: true,
        controlType: 'A1',
        durationDays: 45,
        route: MedicationRoute.IV,
        isAntimicrobial: false,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.doubleCheck).not.toBeNull();
      expect(result.controlledSubstance).not.toBeNull();
      expect(result.antimicrobial).toBeNull();
    });

    it('should return all warnings for antimicrobial', () => {
      const result = service.validateSafety({
        medicationName: 'Amoxicilina',
        isControlled: false,
        isAntimicrobial: true,
        durationDays: 21,
      });
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.antimicrobial).not.toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // First-Check
  // ──────────────────────────────────────────────────────────────────────────

  describe('firstCheck', () => {
    it('should reject non-nurse roles', async () => {
      await expect(
        service.firstCheck('some-id', 'doctor-id', 'DOCTOR'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject non-active prescriptions', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValueOnce({
        id: 'presc-1',
        status: 'DRAFT',
        items: [],
      });
      await expect(
        service.firstCheck('presc-1', 'nurse-id', 'NURSE'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when prescription not found', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.firstCheck('nonexistent', 'nurse-id', 'NURSE'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create first-check entries for all items', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValueOnce({
        id: 'presc-1',
        status: 'ACTIVE',
        items: [{ id: 'item-1' }, { id: 'item-2' }],
      });
      mockPrisma.$transaction.mockResolvedValueOnce([
        { id: 'check-1' },
        { id: 'check-2' },
      ]);

      const result = await service.firstCheck('presc-1', 'nurse-id', 'NURSE');
      expect(result).toMatchObject({
        prescriptionId: 'presc-1',
        checkedBy: 'nurse-id',
        status: 'FIRST_CHECK',
        itemsChecked: 2,
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Double-Check
  // ──────────────────────────────────────────────────────────────────────────

  describe('doubleCheck', () => {
    it('should reject non-nurse roles', async () => {
      await expect(
        service.doubleCheck('some-id', 'doctor-id', 'DOCTOR'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject when prescription not found', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.doubleCheck('nonexistent', 'nurse-id', 'NURSE'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject when prescription does not require double check', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValueOnce({
        id: 'presc-1',
        status: 'ACTIVE',
        requiresDoubleCheck: false,
        doubleCheckedAt: null,
        items: [],
      });
      await expect(
        service.doubleCheck('presc-1', 'nurse-2', 'NURSE'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when already double checked', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValueOnce({
        id: 'presc-1',
        status: 'ACTIVE',
        requiresDoubleCheck: true,
        doubleCheckedAt: new Date(),
        items: [],
      });
      await expect(
        service.doubleCheck('presc-1', 'nurse-2', 'NURSE'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when first check has not been done', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValueOnce({
        id: 'presc-1',
        status: 'ACTIVE',
        requiresDoubleCheck: true,
        doubleCheckedAt: null,
        items: [{ id: 'item-1', medicationChecks: [] }],
      });
      await expect(
        service.doubleCheck('presc-1', 'nurse-2', 'NURSE'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when same person does both checks', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValueOnce({
        id: 'presc-1',
        status: 'ACTIVE',
        requiresDoubleCheck: true,
        doubleCheckedAt: null,
        items: [
          {
            id: 'item-1',
            medicationChecks: [
              { id: 'check-1', nurseId: 'nurse-1', status: 'FIRST_CHECK' },
            ],
          },
        ],
      });
      await expect(
        service.doubleCheck('presc-1', 'nurse-1', 'NURSE'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should succeed with valid double check', async () => {
      mockPrisma.prescription.findUnique.mockResolvedValueOnce({
        id: 'presc-1',
        status: 'ACTIVE',
        requiresDoubleCheck: true,
        doubleCheckedAt: null,
        items: [
          {
            id: 'item-1',
            medicationChecks: [
              { id: 'check-1', nurseId: 'nurse-1', status: 'FIRST_CHECK' },
            ],
          },
        ],
      });

      const now = new Date();
      mockPrisma.prescription.update.mockResolvedValueOnce({
        id: 'presc-1',
        doubleCheckedById: 'nurse-2',
        doubleCheckedAt: now,
        doubleCheckedBy: { id: 'nurse-2', name: 'Nurse Two' },
      });

      const result = await service.doubleCheck('presc-1', 'nurse-2', 'NURSE');
      expect(result).toMatchObject({
        prescriptionId: 'presc-1',
        status: 'DOUBLE_CHECKED',
      });
    });
  });
});
