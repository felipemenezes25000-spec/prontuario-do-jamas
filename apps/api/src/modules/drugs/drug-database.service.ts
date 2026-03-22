import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

// ─── Response interfaces ────────────────────────────────────────────────────

export interface DrugInteractionResult {
  drug1: { id: string; name: string; activeIngredient: string };
  drug2: { id: string; name: string; activeIngredient: string };
  severity: string;
  effect: string;
  management: string | null;
  mechanism: string;
  evidence: string | null;
}

export interface InteractionCheckResult {
  interactions: DrugInteractionResult[];
  hasSevere: boolean;
}

export interface AllergyConflictResult {
  hasConflict: boolean;
  matchedAllergies: Array<{
    id: string;
    substance: string;
    severity: string;
    reaction: string | null;
  }>;
}

export interface DoseLimitResult {
  withinLimits: boolean;
  maxDaily: string | null;
  warnings: string[];
}

export interface BeersListResult {
  isOnBeersList: boolean;
  criteria: string | null;
  alternative?: string;
}

export interface PregnancyCategoryResult {
  category: string | null;
  isSafe: boolean;
  warning: string;
}

export interface ComprehensiveCheckResult {
  interactions: InteractionCheckResult;
  allergyConflicts: Array<{
    drugId: string;
    drugName: string;
    conflict: AllergyConflictResult;
  }>;
  beersWarnings: Array<{
    drugId: string;
    drugName: string;
    beers: BeersListResult;
  }>;
  pregnancyWarnings: Array<{
    drugId: string;
    drugName: string;
    pregnancy: PregnancyCategoryResult;
  }>;
  highAlertDrugs: Array<{ id: string; name: string }>;
  overallRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class DrugDatabaseService {
  private readonly logger = new Logger(DrugDatabaseService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Full-text search drugs by name, activeIngredient, or therapeuticClass.
   */
  async searchDrugs(
    query?: string,
    filters?: {
      isControlled?: boolean;
      isAntimicrobial?: boolean;
      isHighAlert?: boolean;
      therapeuticClass?: string;
    },
    page = 1,
    limit = 20,
  ) {
    const where: Prisma.DrugWhereInput = {
      isActive: true,
    };

    if (query && query.trim().length > 0) {
      const searchTerm = query.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { activeIngredient: { contains: searchTerm, mode: 'insensitive' } },
        { therapeuticClass: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (filters?.isControlled !== undefined) {
      where.isControlled = filters.isControlled;
    }
    if (filters?.isAntimicrobial !== undefined) {
      where.isAntimicrobial = filters.isAntimicrobial;
    }
    if (filters?.isHighAlert !== undefined) {
      where.isHighAlert = filters.isHighAlert;
    }
    if (filters?.therapeuticClass) {
      where.therapeuticClass = {
        contains: filters.therapeuticClass,
        mode: 'insensitive',
      };
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.drug.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.drug.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a single drug by ID with its interactions.
   */
  async findDrugById(id: string) {
    const drug = await this.prisma.drug.findUnique({
      where: { id },
      include: {
        interactionsAs1: {
          include: {
            drug2: {
              select: { id: true, name: true, activeIngredient: true },
            },
          },
        },
        interactionsAs2: {
          include: {
            drug1: {
              select: { id: true, name: true, activeIngredient: true },
            },
          },
        },
      },
    });

    if (!drug) {
      throw new NotFoundException(`Drug with ID "${id}" not found`);
    }

    // Normalize interactions into a single list
    const interactions = [
      ...drug.interactionsAs1.map((i) => ({
        id: i.id,
        otherDrug: i.drug2,
        severity: i.severity,
        effect: i.effect,
        management: i.management,
        mechanism: i.mechanism,
        evidence: i.evidence,
      })),
      ...drug.interactionsAs2.map((i) => ({
        id: i.id,
        otherDrug: i.drug1,
        severity: i.severity,
        effect: i.effect,
        management: i.management,
        mechanism: i.mechanism,
        evidence: i.evidence,
      })),
    ];

    const { interactionsAs1: _interactionsAs1, interactionsAs2: _interactionsAs2, ...drugData } = drug;

    return { ...drugData, interactions };
  }

  /**
   * Check all pairwise interactions for a list of drug IDs.
   */
  async checkInteractions(drugIds: string[]): Promise<InteractionCheckResult> {
    if (drugIds.length < 2) {
      return { interactions: [], hasSevere: false };
    }

    // Find all interactions where both drugs are in the provided list
    const dbInteractions = await this.prisma.drugInteraction.findMany({
      where: {
        OR: [
          { drug1Id: { in: drugIds }, drug2Id: { in: drugIds } },
        ],
      },
      include: {
        drug1: { select: { id: true, name: true, activeIngredient: true } },
        drug2: { select: { id: true, name: true, activeIngredient: true } },
      },
    });

    const interactions: DrugInteractionResult[] = dbInteractions.map((i) => ({
      drug1: i.drug1,
      drug2: i.drug2,
      severity: i.severity,
      effect: i.effect,
      management: i.management,
      mechanism: i.mechanism,
      evidence: i.evidence,
    }));

    const hasSevere = interactions.some((i) => i.severity === 'SEVERE');

    return { interactions, hasSevere };
  }

  /**
   * Check if a drug's active ingredient matches any of the patient's active allergies.
   */
  async checkAllergyConflict(
    drugId: string,
    patientId: string,
  ): Promise<AllergyConflictResult> {
    const drug = await this.prisma.drug.findUnique({
      where: { id: drugId },
      select: { activeIngredient: true, name: true },
    });

    if (!drug) {
      throw new NotFoundException(`Drug with ID "${drugId}" not found`);
    }

    const allergies = await this.prisma.allergy.findMany({
      where: {
        patientId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        substance: true,
        severity: true,
        reaction: true,
      },
    });

    // Check if any allergy substance matches the drug name or active ingredient
    const ingredients = drug.activeIngredient
      .toLowerCase()
      .split('+')
      .map((s) => s.trim());
    const drugNameLower = drug.name.toLowerCase();

    const matchedAllergies = allergies.filter((allergy) => {
      const substanceLower = allergy.substance.toLowerCase();
      return (
        ingredients.some((ing) => substanceLower.includes(ing) || ing.includes(substanceLower)) ||
        substanceLower.includes(drugNameLower) ||
        drugNameLower.includes(substanceLower)
      );
    });

    return {
      hasConflict: matchedAllergies.length > 0,
      matchedAllergies,
    };
  }

  /**
   * Check if prescribed dose is within max daily limits.
   */
  async checkDoseLimits(
    drugId: string,
    dose: number,
    unit: string,
    frequency: string,
    patientWeight?: number,
    patientAge?: number,
  ): Promise<DoseLimitResult> {
    const drug = await this.prisma.drug.findUnique({
      where: { id: drugId },
      select: {
        name: true,
        maxDosePerDay: true,
        isHighAlert: true,
        geriatricCaution: true,
        pediatricUse: true,
      },
    });

    if (!drug) {
      throw new NotFoundException(`Drug with ID "${drugId}" not found`);
    }

    const warnings: string[] = [];

    // Parse frequency to get administrations per day
    const adminsPerDay = this.parseFrequencyToDaily(frequency);
    const dailyDose = dose * adminsPerDay;

    let withinLimits = true;

    if (drug.maxDosePerDay) {
      const maxDoseNum = parseFloat(drug.maxDosePerDay);
      if (!isNaN(maxDoseNum) && dailyDose > maxDoseNum) {
        withinLimits = false;
        warnings.push(
          `Dose diária calculada (${dailyDose}${unit}) excede o máximo recomendado (${drug.maxDosePerDay}${unit})`,
        );
      }
    }

    if (drug.isHighAlert) {
      warnings.push(
        `${drug.name} é medicamento de ALTO ALERTA. Requer dupla checagem.`,
      );
    }

    if (patientAge !== undefined && patientAge >= 65 && drug.geriatricCaution) {
      warnings.push(
        `Paciente idoso (${patientAge} anos). ${drug.name} requer cautela em idosos. Considerar ajuste de dose.`,
      );
    }

    if (patientAge !== undefined && patientAge < 18 && !drug.pediatricUse) {
      warnings.push(
        `${drug.name} não é recomendado para uso pediátrico.`,
      );
    }

    return {
      withinLimits,
      maxDaily: drug.maxDosePerDay,
      warnings,
    };
  }

  /**
   * Check if a drug is on the Beers list (for patients >= 65 years).
   */
  async checkBeersListCriteria(
    drugId: string,
    patientAge: number,
  ): Promise<BeersListResult> {
    const drug = await this.prisma.drug.findUnique({
      where: { id: drugId },
      select: { name: true, beersListCriteria: true },
    });

    if (!drug) {
      throw new NotFoundException(`Drug with ID "${drugId}" not found`);
    }

    if (!drug.beersListCriteria || patientAge < 65) {
      return {
        isOnBeersList: false,
        criteria: null,
      };
    }

    return {
      isOnBeersList: true,
      criteria: drug.beersListCriteria,
    };
  }

  /**
   * Return pregnancy risk category for a drug.
   */
  async checkPregnancyCategory(drugId: string): Promise<PregnancyCategoryResult> {
    const drug = await this.prisma.drug.findUnique({
      where: { id: drugId },
      select: { name: true, pregnancyCategory: true },
    });

    if (!drug) {
      throw new NotFoundException(`Drug with ID "${drugId}" not found`);
    }

    const category = drug.pregnancyCategory;

    if (!category) {
      return {
        category: null,
        isSafe: false,
        warning: `Categoria de risco na gestação não classificada para ${drug.name}.`,
      };
    }

    const safeCategories = ['A', 'B'];
    const isSafe = safeCategories.includes(category.toUpperCase());

    const warningMap: Record<string, string> = {
      A: `${drug.name} — Categoria A: Estudos controlados não demonstraram risco.`,
      B: `${drug.name} — Categoria B: Sem evidência de risco em humanos.`,
      C: `${drug.name} — Categoria C: Risco não pode ser descartado. Usar somente se benefício justificar.`,
      D: `${drug.name} — Categoria D: Evidência positiva de risco fetal. Usar somente em situações graves.`,
      X: `${drug.name} — Categoria X: CONTRAINDICADO NA GESTAÇÃO. Risco fetal comprovado supera qualquer benefício.`,
    };

    return {
      category,
      isSafe,
      warning: warningMap[category.toUpperCase()] ?? `${drug.name} — Categoria ${category}.`,
    };
  }

  /**
   * Run comprehensive checks: interactions + allergy + Beers + pregnancy + high-alert flags.
   */
  async getComprehensiveCheck(
    drugIds: string[],
    patientId: string,
  ): Promise<ComprehensiveCheckResult> {
    // Load patient for age calculation
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { birthDate: true, gender: true },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID "${patientId}" not found`);
    }

    const patientAge = this.calculateAge(patient.birthDate);

    // Load all drugs
    const drugs = await this.prisma.drug.findMany({
      where: { id: { in: drugIds } },
    });

    // 1. Check interactions
    const interactions = await this.checkInteractions(drugIds);

    // 2. Check allergies for each drug
    const allergyConflicts: ComprehensiveCheckResult['allergyConflicts'] = [];
    for (const drug of drugs) {
      const conflict = await this.checkAllergyConflict(drug.id, patientId);
      if (conflict.hasConflict) {
        allergyConflicts.push({
          drugId: drug.id,
          drugName: drug.name,
          conflict,
        });
      }
    }

    // 3. Check Beers list for each drug (if patient >= 65)
    const beersWarnings: ComprehensiveCheckResult['beersWarnings'] = [];
    if (patientAge >= 65) {
      for (const drug of drugs) {
        const beers = await this.checkBeersListCriteria(drug.id, patientAge);
        if (beers.isOnBeersList) {
          beersWarnings.push({
            drugId: drug.id,
            drugName: drug.name,
            beers,
          });
        }
      }
    }

    // 4. Pregnancy category warnings (for all drugs)
    const pregnancyWarnings: ComprehensiveCheckResult['pregnancyWarnings'] = [];
    for (const drug of drugs) {
      const pregnancy = await this.checkPregnancyCategory(drug.id);
      if (!pregnancy.isSafe && pregnancy.category) {
        pregnancyWarnings.push({
          drugId: drug.id,
          drugName: drug.name,
          pregnancy,
        });
      }
    }

    // 5. High-alert drugs
    const highAlertDrugs = drugs
      .filter((d) => d.isHighAlert)
      .map((d) => ({ id: d.id, name: d.name }));

    // 6. Calculate overall risk
    const overallRisk = this.calculateOverallRisk(
      interactions,
      allergyConflicts,
      beersWarnings,
      highAlertDrugs,
    );

    return {
      interactions,
      allergyConflicts,
      beersWarnings,
      pregnancyWarnings,
      highAlertDrugs,
      overallRisk,
    };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private parseFrequencyToDaily(frequency: string): number {
    // Parse common Brazilian frequency formats: "6/6h", "8/8h", "12/12h", "24/24h", "1x/dia"
    const hourMatch = frequency.match(/(\d+)\/(\d+)\s*h/i);
    if (hourMatch) {
      const intervalHours = parseInt(hourMatch[2], 10);
      return Math.floor(24 / intervalHours);
    }

    const timesMatch = frequency.match(/(\d+)\s*x\s*\/?\s*dia/i);
    if (timesMatch) {
      return parseInt(timesMatch[1], 10);
    }

    // Default to once daily if unable to parse
    return 1;
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }

  private calculateOverallRisk(
    interactions: InteractionCheckResult,
    allergyConflicts: ComprehensiveCheckResult['allergyConflicts'],
    beersWarnings: ComprehensiveCheckResult['beersWarnings'],
    highAlertDrugs: Array<{ id: string; name: string }>,
  ): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
    // CRITICAL: severe interaction + allergy conflict
    if (interactions.hasSevere && allergyConflicts.length > 0) {
      return 'CRITICAL';
    }

    // CRITICAL: any allergy conflict (can be life-threatening)
    if (allergyConflicts.length > 0) {
      return 'CRITICAL';
    }

    // HIGH: severe interactions
    if (interactions.hasSevere) {
      return 'HIGH';
    }

    // MODERATE: moderate interactions, Beers warnings, or high-alert drugs
    if (
      interactions.interactions.length > 0 ||
      beersWarnings.length > 0 ||
      highAlertDrugs.length > 0
    ) {
      return 'MODERATE';
    }

    return 'LOW';
  }
}
