import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PregnancyAlertDto,
  CheckPregnancyRiskDto,
  LactationAlertDto,
  CheckLactationRiskDto,
  RenalAdjustmentDto,
  HepaticAdjustmentDto,
  DrugFoodInteractionDto,
  CheckDrugFoodInteractionDto,
  GenericEquivalenceDto,
  LookupGenericEquivalencesDto,
  EPrescribingDto,
  ValidateProtocolPrescriptionDto,
  PCAPrescriptionDto,
  FDACategory,
  LactationRiskLevel,
  GFRFormula,
  ChildPughClass,
  DrugFoodSeverity,
  EPrescribingPlatform,
  ProtocolDeviationSeverity,
  PregnancyRiskCheckResult,
  LactationRiskCheckResult,
  RenalAdjustmentResult,
  HepaticAdjustmentResult,
  DrugFoodInteractionCheckResult,
  GenericEquivalenceResult,
  EPrescribingResult,
  ProtocolValidationResult,
  PCAPrescriptionRecord,
  GenericAlternativeDto,
  ProtocolDeviationDto,
} from './dto/prescription-safety.dto';

// ─── Static drug safety database (stub — replace with real DB/API lookup) ─────

const PREGNANCY_DB: Record<string, { category: FDACategory; description: string }> = {
  amoxicillin: { category: FDACategory.B, description: 'Animal studies show no risk; no controlled human studies.' },
  azithromycin: { category: FDACategory.B, description: 'Animal studies show no risk; limited human data.' },
  ciprofloxacin: { category: FDACategory.C, description: 'Animal studies show adverse effects; inadequate human studies. Use only if benefit justifies risk.' },
  doxycycline: { category: FDACategory.D, description: 'Evidence of human fetal risk. Avoid in pregnancy, particularly after 15 weeks.' },
  methotrexate: { category: FDACategory.X, description: 'Fetal abnormalities documented. Absolutely contraindicated in pregnancy.' },
  warfarin: { category: FDACategory.X, description: 'Fetal warfarin syndrome risk. Use heparin alternatives.' },
  isotretinoin: { category: FDACategory.X, description: 'Teratogen. Absolutely contraindicated.' },
  ibuprofen: { category: FDACategory.C, description: 'Avoid in third trimester — premature ductus arteriosus closure risk.' },
  paracetamol: { category: FDACategory.B, description: 'Considered safe in all trimesters at standard doses.' },
  metformin: { category: FDACategory.B, description: 'Generally considered safe; may be continued in gestational diabetes.' },
};

const LACTATION_DB: Record<string, { level: LactationRiskLevel; passes: boolean; infantRisk: string; recommendation: string }> = {
  amoxicillin: { level: LactationRiskLevel.SAFE, passes: true, infantRisk: 'Minimal — potential diarrhea in infant', recommendation: 'Compatible with breastfeeding.' },
  ibuprofen: { level: LactationRiskLevel.SAFE, passes: true, infantRisk: 'Very low transfer; short half-life', recommendation: 'Preferred NSAID during breastfeeding.' },
  aspirin: { level: LactationRiskLevel.POTENTIALLY_HAZARDOUS, passes: true, infantRisk: 'Reye syndrome risk at anti-inflammatory doses', recommendation: 'Avoid at high doses; low-dose cardiac doses generally acceptable.' },
  methotrexate: { level: LactationRiskLevel.CONTRAINDICATED, passes: true, infantRisk: 'Immunosuppression, neutropenia, growth retardation', recommendation: 'Contraindicated. Discontinue breastfeeding.' },
  lithium: { level: LactationRiskLevel.POTENTIALLY_HAZARDOUS, passes: true, infantRisk: 'Elevated infant serum lithium; toxicity possible', recommendation: 'Avoid if possible. Monitor infant levels if continued.' },
  paracetamol: { level: LactationRiskLevel.SAFE, passes: true, infantRisk: 'Very low transfer; no adverse effects reported', recommendation: 'Preferred analgesic during breastfeeding.' },
};

const DRUG_FOOD_DB: Record<string, { food: string; severity: DrugFoodSeverity; recommendation: string; mechanism: string }[]> = {
  warfarin: [
    { food: 'Vitamina K (folhas verdes)', severity: DrugFoodSeverity.MAJOR, recommendation: 'Manter consumo consistente de alimentos ricos em vitamina K; não eliminar da dieta.', mechanism: 'Antagonismo farmacodinâmico — vitamina K reverte anticoagulação.' },
    { food: 'Cranberry (suco/extrato)', severity: DrugFoodSeverity.MODERATE, recommendation: 'Evitar consumo excessivo de cranberry; monitorar INR mais frequentemente.', mechanism: 'Inibição do metabolismo CYP2C9 da varfarina.' },
  ],
  metformin: [
    { food: 'Álcool', severity: DrugFoodSeverity.MAJOR, recommendation: 'Evitar consumo de álcool. Risco aumentado de acidose lática.', mechanism: 'Potencialização da produção de lactato hepática.' },
  ],
  ciprofloxacin: [
    { food: 'Leite / laticínios', severity: DrugFoodSeverity.MODERATE, recommendation: 'Tomar 2h antes ou 6h após laticínios.', mechanism: 'Quelação com cálcio reduz absorção em até 30-36%.' },
    { food: 'Suplementos de cálcio / magnésio', severity: DrugFoodSeverity.MODERATE, recommendation: 'Separar administração por pelo menos 2 horas.', mechanism: 'Quelação divalente diminui biodisponibilidade.' },
  ],
  levothyroxine: [
    { food: 'Fibras / farelo de aveia', severity: DrugFoodSeverity.MODERATE, recommendation: 'Administrar levotiroxina 30-60 min antes do café da manhã, incluindo suplementos fibrosos.', mechanism: 'Fibras reduzem absorção intestinal.' },
    { food: 'Café forte', severity: DrugFoodSeverity.MODERATE, recommendation: 'Aguardar pelo menos 30 min após administração antes de ingerir café.', mechanism: 'Cafeína pode diminuir absorção gástrica.' },
  ],
  sildenafil: [
    { food: 'Toranja (grapefruit)', severity: DrugFoodSeverity.MAJOR, recommendation: 'Evitar totalmente toranja e suco de toranja.', mechanism: 'Inibição de CYP3A4 intestinal aumenta biodisponibilidade do sildenafil em 212%.' },
  ],
};

const GENERIC_DB: Record<string, { activeIngredient: string; brandPrice: number; generics: GenericAlternativeDto[] }> = {
  'Lipitor': {
    activeIngredient: 'atorvastatin',
    brandPrice: 4.80,
    generics: [
      { genericName: 'Atorvastatina EMS', activeIngredient: 'atorvastatin', pricePerUnit: 0.85, manufacturer: 'EMS', bioequivalenceProven: true, anvisaRegistration: '123456789' },
      { genericName: 'Atorvastatina Teuto', activeIngredient: 'atorvastatin', pricePerUnit: 0.92, manufacturer: 'Teuto', bioequivalenceProven: true, anvisaRegistration: '987654321' },
    ],
  },
  'Glifage': {
    activeIngredient: 'metformin',
    brandPrice: 2.50,
    generics: [
      { genericName: 'Metformina EMS', activeIngredient: 'metformin', pricePerUnit: 0.35, manufacturer: 'EMS', bioequivalenceProven: true, anvisaRegistration: '111222333' },
      { genericName: 'Metformina Medley', activeIngredient: 'metformin', pricePerUnit: 0.40, manufacturer: 'Medley', bioequivalenceProven: true, anvisaRegistration: '444555666' },
    ],
  },
  'Nexium': {
    activeIngredient: 'esomeprazole',
    brandPrice: 5.20,
    generics: [
      { genericName: 'Esomeprazol EMS', activeIngredient: 'esomeprazole', pricePerUnit: 1.10, manufacturer: 'EMS', bioequivalenceProven: true, anvisaRegistration: '777888999' },
    ],
  },
};

// ─── PCA Store ─────────────────────────────────────────────────────────────────

const pcaStore = new Map<string, PCAPrescriptionRecord>();

@Injectable()
export class PrescriptionAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Pregnancy Alerts ───────────────────────────────────────────────────────

  async checkPregnancyRisk(
    dto: CheckPregnancyRiskDto,
  ): Promise<PregnancyRiskCheckResult> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
      select: { id: true, gender: true, birthDate: true },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    // In production, query pregnancy status from clinical record
    const isPregnant = false; // placeholder
    const gestationalAgeWeeks: number | null = null;

    const medications = dto.medications.map((name) => {
      const entry = PREGNANCY_DB[name.toLowerCase()];
      if (!entry) {
        return {
          name,
          fdaCategory: null,
          riskLevel: 'unknown' as const,
          recommendation: 'No pregnancy safety data available. Consult pharmacist.',
        };
      }
      const riskLevel =
        entry.category === FDACategory.X
          ? ('contraindicated' as const)
          : entry.category === FDACategory.D
            ? ('caution' as const)
            : entry.category === FDACategory.A || entry.category === FDACategory.B
              ? ('safe' as const)
              : ('caution' as const);
      return {
        name,
        fdaCategory: entry.category,
        riskLevel,
        recommendation: entry.description,
      };
    });

    return { patientId: dto.patientId, isPregnant, gestationalAgeWeeks, medications };
  }

  async addPregnancyAlert(dto: PregnancyAlertDto): Promise<PregnancyAlertDto & { id: string; createdAt: Date }> {
    return { ...dto, id: crypto.randomUUID(), createdAt: new Date() };
  }

  // ─── Lactation Alerts ───────────────────────────────────────────────────────

  async checkLactationRisk(dto: CheckLactationRiskDto): Promise<LactationRiskCheckResult> {
    const medications = dto.medications.map((name) => {
      const entry = LACTATION_DB[name.toLowerCase()];
      if (!entry) {
        return {
          name,
          riskLevel: LactationRiskLevel.UNKNOWN,
          passesToMilk: null,
          infantRisk: null,
          recommendation: 'No lactation safety data available. Consult LactMed or pharmacist.',
        };
      }
      return {
        name,
        riskLevel: entry.level,
        passesToMilk: entry.passes,
        infantRisk: entry.infantRisk,
        recommendation: entry.recommendation,
      };
    });
    return { medications };
  }

  async addLactationAlert(dto: LactationAlertDto): Promise<LactationAlertDto & { id: string; createdAt: Date }> {
    return { ...dto, id: crypto.randomUUID(), createdAt: new Date() };
  }

  // ─── Renal Dose Adjustment ──────────────────────────────────────────────────

  async calculateRenalAdjustment(
    dto: RenalAdjustmentDto,
  ): Promise<RenalAdjustmentResult> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
      select: { id: true, birthDate: true, gender: true },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    let gfr: number;
    const formula = dto.gfrFormula ?? GFRFormula.CKD_EPI;

    if (dto.providedGFR !== undefined) {
      gfr = dto.providedGFR;
    } else {
      gfr = this.estimateGFR(dto.creatinine, patient.birthDate, patient.gender, formula);
    }

    const ckdStage = this.getCKDStage(gfr);
    const { adjustmentRequired, suggestedDose, interval, contraindicated, notes } =
      this.getRenalDosing(dto.medication, gfr, dto.standardDose);

    return {
      patientId: dto.patientId,
      medication: dto.medication,
      creatinine: dto.creatinine,
      gfr,
      gfrFormula: formula,
      ckdStage,
      adjustmentRequired,
      suggestedDose,
      interval,
      contraindicated,
      notes,
    };
  }

  // ─── Hepatic Dose Adjustment ────────────────────────────────────────────────

  async calculateHepaticAdjustment(
    dto: HepaticAdjustmentDto,
  ): Promise<HepaticAdjustmentResult> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    const { adjustmentRequired, suggestedDose, contraindicated, notes } =
      this.getHepaticDosing(dto.medication, dto.childPughScore, dto.standardDose);

    return {
      patientId: dto.patientId,
      medication: dto.medication,
      childPughClass: dto.childPughScore,
      adjustmentRequired,
      suggestedDose,
      contraindicated,
      notes,
    };
  }

  // ─── Drug-Food Interactions ─────────────────────────────────────────────────

  async checkDrugFoodInteractions(
    dto: CheckDrugFoodInteractionDto,
  ): Promise<DrugFoodInteractionCheckResult> {
    const medications = dto.medications.map((name) => {
      const key = name.toLowerCase();
      const entries = DRUG_FOOD_DB[key] ?? [];
      return {
        name,
        interactions: entries.map((e) => ({
          food: e.food,
          severity: e.severity,
          recommendation: e.recommendation,
          mechanism: e.mechanism,
        })),
      };
    });
    return { medications };
  }

  async addDrugFoodInteraction(
    dto: DrugFoodInteractionDto,
  ): Promise<DrugFoodInteractionDto & { id: string; createdAt: Date }> {
    return { ...dto, id: crypto.randomUUID(), createdAt: new Date() };
  }

  // ─── Generic Equivalence ───────────────────────────────────────────────────

  async lookupGenericEquivalences(
    dto: LookupGenericEquivalencesDto,
  ): Promise<GenericEquivalenceResult> {
    const entry = GENERIC_DB[dto.brandName];
    if (!entry) {
      return {
        brandName: dto.brandName,
        activeIngredient: 'unknown',
        brandPricePerUnit: null,
        alternatives: [],
        estimatedSavingsPercent: null,
      };
    }
    const cheapest = entry.generics.reduce<number | null>((min, g) => {
      const price = g.pricePerUnit ?? null;
      if (price === null) return min;
      if (min === null) return price;
      return price < min ? price : min;
    }, null);
    const savingsPercent =
      cheapest !== null && entry.brandPrice > 0
        ? Math.round(((entry.brandPrice - cheapest) / entry.brandPrice) * 100)
        : null;
    return {
      brandName: dto.brandName,
      activeIngredient: entry.activeIngredient,
      brandPricePerUnit: entry.brandPrice,
      alternatives: entry.generics,
      estimatedSavingsPercent: savingsPercent,
    };
  }

  async registerGenericEquivalences(
    dto: GenericEquivalenceDto,
  ): Promise<GenericEquivalenceDto & { id: string; createdAt: Date }> {
    return { ...dto, id: crypto.randomUUID(), createdAt: new Date() };
  }

  // ─── e-Prescribing ─────────────────────────────────────────────────────────

  async sendEPrescription(dto: EPrescribingDto): Promise<EPrescribingResult> {
    // Verify prescription exists
    const prescription = await this.prisma.prescription.findUnique({
      where: { id: dto.prescriptionId },
    });
    if (!prescription) {
      throw new NotFoundException(`Prescription "${dto.prescriptionId}" not found`);
    }

    // Simulate external API call — in production, call Memed/Nexodata SDK
    const externalId = `EXT-${dto.externalPlatform}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const patientLink =
      dto.externalPlatform === EPrescribingPlatform.MEMED
        ? `https://app.memed.com.br/prescricao/${externalId}`
        : dto.externalPlatform === EPrescribingPlatform.NEXODATA
          ? `https://prescricao.nexodata.com.br/${externalId}`
          : null;

    return {
      prescriptionId: dto.prescriptionId,
      externalId,
      platform: dto.externalPlatform,
      status: 'sent',
      patientLink,
      pharmacyQrCode: `data:image/png;base64,QR_${externalId}`,
      sentAt: new Date(),
    };
  }

  // ─── Protocol Validation ───────────────────────────────────────────────────

  async validateProtocolPrescription(
    dto: ValidateProtocolPrescriptionDto,
  ): Promise<ProtocolValidationResult> {
    const deviations: ProtocolDeviationDto[] = [];

    // Stub protocol rules — in production, query a protocol database
    const protocol = this.getProtocolRules(dto.protocolName, dto.medicationName);

    if (protocol) {
      if (protocol.expectedDose && dto.dose !== protocol.expectedDose) {
        deviations.push({
          field: 'dose',
          expectedValue: protocol.expectedDose,
          actualValue: dto.dose,
          severity: ProtocolDeviationSeverity.WARNING,
        });
      }
      if (protocol.expectedRoute && dto.route.toUpperCase() !== protocol.expectedRoute.toUpperCase()) {
        deviations.push({
          field: 'route',
          expectedValue: protocol.expectedRoute,
          actualValue: dto.route,
          severity: ProtocolDeviationSeverity.CRITICAL,
        });
      }
      if (protocol.expectedFrequency && dto.frequency !== protocol.expectedFrequency) {
        deviations.push({
          field: 'frequency',
          expectedValue: protocol.expectedFrequency,
          actualValue: dto.frequency,
          severity: ProtocolDeviationSeverity.WARNING,
        });
      }
    }

    const maxSeverity = deviations.reduce<ProtocolDeviationSeverity | null>((max, d) => {
      if (max === null) return d.severity;
      const order = [ProtocolDeviationSeverity.INFO, ProtocolDeviationSeverity.WARNING, ProtocolDeviationSeverity.CRITICAL];
      return order.indexOf(d.severity) > order.indexOf(max) ? d.severity : max;
    }, null);

    return {
      protocolName: dto.protocolName,
      compliant: deviations.length === 0,
      deviations,
      overallSeverity: maxSeverity,
      requiresJustification: maxSeverity === ProtocolDeviationSeverity.CRITICAL,
    };
  }

  // ─── PCA Prescriptions ─────────────────────────────────────────────────────

  async createPCAPrescription(
    prescribedById: string,
    dto: PCAPrescriptionDto,
  ): Promise<PCAPrescriptionRecord> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    if (dto.lockoutMinutes < 5) {
      throw new BadRequestException(
        'PCA lockout interval must be at least 5 minutes for safety.',
      );
    }

    const id = crypto.randomUUID();
    const record: PCAPrescriptionRecord = {
      id,
      patientId: dto.patientId,
      medication: dto.medication,
      bolusDose: dto.bolusDose,
      lockoutMinutes: dto.lockoutMinutes,
      mode: dto.mode,
      continuousRate: dto.continuousRate ?? null,
      hourlyLimit: dto.hourlyLimit ?? null,
      fourHourLimit: dto.fourHourLimit ?? null,
      concentration: dto.concentration ?? null,
      specialInstructions: dto.specialInstructions ?? null,
      createdAt: new Date(),
      prescribedById,
    };
    pcaStore.set(id, record);
    return record;
  }

  async listPCAPrescriptions(patientId: string): Promise<PCAPrescriptionRecord[]> {
    return [...pcaStore.values()]
      .filter((p) => p.patientId === patientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPCAPrescription(id: string): Promise<PCAPrescriptionRecord> {
    const record = pcaStore.get(id);
    if (!record) {
      throw new NotFoundException(`PCA prescription "${id}" not found`);
    }
    return record;
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private estimateGFR(
    creatinine: number,
    birthDate: Date | null,
    gender: string | null,
    formula: GFRFormula,
  ): number {
    if (!birthDate) return 60; // fallback when no DOB
    const age = Math.floor(
      (Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000),
    );
    const isFemale = gender?.toLowerCase() === 'female' || gender?.toLowerCase() === 'feminino';

    if (formula === GFRFormula.COCKCROFT_GAULT) {
      // Cockcroft-Gault: assumes weight 70kg (placeholder)
      const weightKg = 70;
      const cg = ((140 - age) * weightKg) / (72 * creatinine);
      return Math.round(isFemale ? cg * 0.85 : cg);
    }

    // CKD-EPI (simplified, race-free 2021 equation)
    const kappa = isFemale ? 0.7 : 0.9;
    const alpha = isFemale ? -0.241 : -0.302;
    const scrOverK = creatinine / kappa;
    const min = Math.min(scrOverK, 1);
    const max = Math.max(scrOverK, 1);
    const gfr =
      142 *
      Math.pow(min, alpha) *
      Math.pow(max, -1.200) *
      Math.pow(0.9938, age) *
      (isFemale ? 1.012 : 1);
    return Math.round(gfr);
  }

  private getCKDStage(gfr: number): string {
    if (gfr >= 90) return 'G1 (Normal ou alta — ≥90 mL/min)';
    if (gfr >= 60) return 'G2 (Levemente reduzida — 60-89 mL/min)';
    if (gfr >= 45) return 'G3a (Leve a moderada — 45-59 mL/min)';
    if (gfr >= 30) return 'G3b (Moderada a grave — 30-44 mL/min)';
    if (gfr >= 15) return 'G4 (Gravemente reduzida — 15-29 mL/min)';
    return 'G5 (Falência renal — <15 mL/min)';
  }

  private getRenalDosing(
    medication: string,
    gfr: number,
    standardDose?: string,
  ): {
    adjustmentRequired: boolean;
    suggestedDose: string;
    interval: string | null;
    contraindicated: boolean;
    notes: string;
  } {
    const med = medication.toLowerCase();

    // Metformin
    if (med.includes('metformin') || med.includes('metformina')) {
      if (gfr < 30) return { adjustmentRequired: true, suggestedDose: 'Contraindicado', interval: null, contraindicated: true, notes: 'Metformin is contraindicated when eGFR < 30 due to lactic acidosis risk.' };
      if (gfr < 45) return { adjustmentRequired: true, suggestedDose: `${standardDose ?? 'dose padrão'} (redução 50%)`, interval: 'A cada 12h', contraindicated: false, notes: 'Use with caution; reduce dose by 50% if eGFR 30-44.' };
      if (gfr < 60) return { adjustmentRequired: true, suggestedDose: standardDose ?? 'dose padrão', interval: null, contraindicated: false, notes: 'Monitor renal function every 3-6 months if eGFR 45-59.' };
    }

    // Ciprofloxacin
    if (med.includes('cipro')) {
      if (gfr < 30) return { adjustmentRequired: true, suggestedDose: '250-500mg', interval: 'A cada 24h', contraindicated: false, notes: 'Reduce ciprofloxacin dose when eGFR < 30.' };
    }

    // Gentamicin
    if (med.includes('gentamicin') || med.includes('gentamicina')) {
      if (gfr < 60) return { adjustmentRequired: true, suggestedDose: 'Dose habitual', interval: `A cada ${Math.round(8 * 60 / Math.max(gfr, 1))}h (ajuste por nível sérico)`, contraindicated: false, notes: 'Extended-interval dosing; monitor serum troughs.' };
    }

    // NSAIDS
    if (med.includes('ibuprofeno') || med.includes('ibuprofen') || med.includes('diclofenac') || med.includes('diclofenaco')) {
      if (gfr < 30) return { adjustmentRequired: true, suggestedDose: 'Contraindicado', interval: null, contraindicated: true, notes: 'NSAIDs contraindicated in CKD G4-G5 due to hemodynamic AKI risk.' };
    }

    return {
      adjustmentRequired: gfr < 60,
      suggestedDose: standardDose ?? 'Dose padrão — avaliar com farmácia clínica',
      interval: null,
      contraindicated: false,
      notes: gfr >= 60
        ? 'No dose adjustment required for current eGFR.'
        : 'Dose adjustment may be needed. Consult clinical pharmacist for specific recommendation.',
    };
  }

  private getHepaticDosing(
    medication: string,
    childPugh: ChildPughClass,
    standardDose?: string,
  ): {
    adjustmentRequired: boolean;
    suggestedDose: string;
    contraindicated: boolean;
    notes: string;
  } {
    const med = medication.toLowerCase();

    // Paracetamol/Acetaminophen
    if (med.includes('paracetamol') || med.includes('acetaminophen')) {
      if (childPugh === ChildPughClass.C) return { adjustmentRequired: true, suggestedDose: 'Máximo 2g/dia', contraindicated: false, notes: 'Severe hepatic impairment: limit acetaminophen to 2g/day.' };
      if (childPugh === ChildPughClass.B) return { adjustmentRequired: true, suggestedDose: 'Máximo 3g/dia', contraindicated: false, notes: 'Moderate hepatic impairment: limit acetaminophen to 3g/day.' };
    }

    // Rifampicin
    if (med.includes('rifampicin') || med.includes('rifampicina')) {
      if (childPugh === ChildPughClass.C) return { adjustmentRequired: true, suggestedDose: 'Contraindicado', contraindicated: true, notes: 'Rifampicin contraindicated in severe hepatic impairment.' };
    }

    // Statins
    if (med.includes('statin') || med.includes('statina') || med.includes('atorvastatin') || med.includes('simvastatin')) {
      if (childPugh === ChildPughClass.C) return { adjustmentRequired: true, suggestedDose: 'Contraindicado', contraindicated: true, notes: 'Statins contraindicated in active liver disease / Child-Pugh C.' };
    }

    // Warfarin
    if (med.includes('warfarin') || med.includes('varfarina')) {
      if (childPugh === ChildPughClass.C) return { adjustmentRequired: true, suggestedDose: 'Iniciar com 50% da dose habitual; titular pelo INR', contraindicated: false, notes: 'Severe hepatic impairment: reduced clotting factor synthesis increases bleeding risk. Start low, titrate.' };
    }

    const adjustmentRequired = childPugh !== ChildPughClass.A;
    return {
      adjustmentRequired,
      suggestedDose: adjustmentRequired
        ? `${standardDose ?? 'Dose padrão'} — avaliar com farmácia clínica`
        : (standardDose ?? 'Dose padrão'),
      contraindicated: false,
      notes: adjustmentRequired
        ? `Hepatic impairment (Child-Pugh ${childPugh}): consult clinical pharmacist for specific ${medication} dosing.`
        : 'No dose adjustment required for Child-Pugh A.',
    };
  }

  private getProtocolRules(
    protocolName: string,
    medicationName: string,
  ): { expectedDose?: string; expectedRoute?: string; expectedFrequency?: string } | null {
    // Stub rule set — replace with real protocol database
    const key = `${protocolName.toLowerCase()}::${medicationName.toLowerCase()}`;
    const rules: Record<string, { expectedDose?: string; expectedRoute?: string; expectedFrequency?: string }> = {
      'sepsis-bundle::piperacillin-tazobactam': { expectedDose: '4.5g', expectedRoute: 'IV', expectedFrequency: 'Q6H' },
      'sepsis-bundle::meropenem': { expectedDose: '1g', expectedRoute: 'IV', expectedFrequency: 'Q8H' },
      'acs-protocol::aspirin': { expectedDose: '300mg (dose de ataque)', expectedRoute: 'VO', expectedFrequency: 'dose única de ataque' },
      'acs-protocol::clopidogrel': { expectedDose: '300-600mg (dose de ataque)', expectedRoute: 'VO', expectedFrequency: 'dose única de ataque' },
    };
    return rules[key] ?? null;
  }
}
