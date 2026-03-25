import {
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ============================================================================
// Interfaces
// ============================================================================

export interface MorseScaleDto {
  patientId: string;
  encounterId?: string;
  historyOfFalling: number;
  secondaryDiagnosis: number;
  ambulatoryAid: number;
  ivTherapy: number;
  gait: number;
  mentalStatus: number;
}

export interface BradenScaleDto {
  patientId: string;
  encounterId?: string;
  sensoryPerception: number;
  moisture: number;
  activity: number;
  mobility: number;
  nutrition: number;
  frictionShear: number;
}

export interface WoundRegistrationDto {
  patientId: string;
  encounterId?: string;
  location: string;
  classification: string;
  stage?: string;
  length?: number;
  width?: number;
  depth?: number;
  tissueType?: string;
  exudateAmount?: string;
  exudateType?: string;
  odor?: boolean;
  painLevel?: number;
  photoUrl?: string;
  dressingUsed?: string;
  notes?: string;
}

export interface PainScaleDto {
  patientId: string;
  encounterId?: string;
  scaleType: 'VAS' | 'FLACC' | 'BPS';
  score: number;
  location?: string;
  characteristics?: string;
  postAnalgesia?: boolean;
  analgesiaTime?: string;
  reassessmentScore?: number;
  notes?: string;
}

export interface EliminationTrackingDto {
  patientId: string;
  encounterId?: string;
  type: 'URINE' | 'STOOL' | 'OSTOMY' | 'CATHETER';
  volume?: number;
  aspect?: string;
  bristolScale?: number;
  catheterType?: string;
  notes?: string;
}

export interface AdmissionChecklistDto {
  patientId: string;
  encounterId: string;
  allergiesReviewed: boolean;
  medicationsReviewed: boolean;
  consciousnessLevel: string;
  skinAssessment: string;
  painAssessed: boolean;
  fallRiskAssessed: boolean;
  patientEducationDone: boolean;
  belongingsInventory?: string;
  notes?: string;
}

export interface RepositioningDto {
  patientId: string;
  encounterId: string;
  position: 'DLE' | 'DLD' | 'DD' | 'DV' | 'FOWLER' | 'SEMI_FOWLER';
  notes?: string;
}

export interface CarePlanDto {
  patientId: string;
  encounterId: string;
  diagnosisId?: string;
  interventions: Array<{
    description: string;
    frequency: string;
    responsible: string;
  }>;
  expectedOutcome: string;
  evaluationDate?: string;
}

export interface FugulinDto {
  patientId: string;
  encounterId?: string;
  mentalState: number;
  oxygenation: number;
  vitalSigns: number;
  motility: number;
  ambulation: number;
  feeding: number;
  bodyCareSub: number;
  elimination: number;
  therapeutics: number;
  skinIntegrity: number;
}

export interface StaffingCalculatorDto {
  totalMinimal: number;
  totalIntermediate: number;
  totalSemiIntensive: number;
  totalIntensive: number;
}

export interface WorkScheduleEntryDto {
  nurseId: string;
  date: string;
  shiftType: '6H_MORNING' | '6H_AFTERNOON' | '12X36_DAY' | '12X36_NIGHT';
  isOvertime?: boolean;
  swapWithNurseId?: string;
  notes?: string;
}

export interface CatheterBundleDto {
  patientId: string;
  encounterId: string;
  catheterType: 'URINARY' | 'CVC';
  insertionDate: string;
  indication?: string;
  dailyNecessityReviewed?: boolean;
  careChecklist: Record<string, boolean>;
  notes?: string;
}

@Injectable()
export class NursingEnhancedService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // Morse Fall Risk Scale
  // =========================================================================

  async assessMorse(tenantId: string, nurseId: string, dto: MorseScaleDto) {
    const totalScore = dto.historyOfFalling + dto.secondaryDiagnosis +
      dto.ambulatoryAid + dto.ivTherapy + dto.gait + dto.mentalStatus;

    let riskLevel: string;
    let plan: string;
    if (totalScore >= 45) {
      riskLevel = 'HIGH';
      plan = 'Protocolo alto risco: pulseira vermelha, grades elevadas, supervisão contínua, campainha ao alcance, iluminação noturna, calçado antiderrapante.';
    } else if (totalScore >= 25) {
      riskLevel = 'MODERATE';
      plan = 'Protocolo moderado: orientar campainha, calçado adequado, grades conforme necessidade, reavaliar em 24h.';
    } else {
      riskLevel = 'LOW';
      plan = 'Protocolo baixo risco: orientações padrão de prevenção de quedas, reavaliar em 72h.';
    }

    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `[MORSE_SCALE] Score: ${totalScore} - ${riskLevel}`,
        content: JSON.stringify({
          historyOfFalling: dto.historyOfFalling,
          secondaryDiagnosis: dto.secondaryDiagnosis,
          ambulatoryAid: dto.ambulatoryAid,
          ivTherapy: dto.ivTherapy,
          gait: dto.gait,
          mentalStatus: dto.mentalStatus,
          totalScore,
          riskLevel,
          plan,
          assessedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  // =========================================================================
  // Braden Pressure Injury Scale
  // =========================================================================

  async assessBraden(tenantId: string, nurseId: string, dto: BradenScaleDto) {
    const totalScore = dto.sensoryPerception + dto.moisture + dto.activity +
      dto.mobility + dto.nutrition + dto.frictionShear;

    let riskLevel: string;
    if (totalScore <= 9) riskLevel = 'VERY_HIGH';
    else if (totalScore <= 12) riskLevel = 'HIGH';
    else if (totalScore <= 14) riskLevel = 'MODERATE';
    else if (totalScore <= 18) riskLevel = 'LOW';
    else riskLevel = 'NO_RISK';

    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `[BRADEN_SCALE] Score: ${totalScore} - ${riskLevel}`,
        content: JSON.stringify({
          sensoryPerception: dto.sensoryPerception,
          moisture: dto.moisture,
          activity: dto.activity,
          mobility: dto.mobility,
          nutrition: dto.nutrition,
          frictionShear: dto.frictionShear,
          totalScore,
          riskLevel,
          assessedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  // =========================================================================
  // Wound/Dressing Registration
  // =========================================================================

  async registerWound(tenantId: string, nurseId: string, dto: WoundRegistrationDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `[WOUND_RECORD] ${dto.location} - ${dto.classification}`,
        content: JSON.stringify({
          ...dto,
          area: dto.length && dto.width ? dto.length * dto.width : null,
          assessedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async listWounds(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: '[WOUND_RECORD]' } },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((doc) => ({ id: doc.id, ...JSON.parse(doc.content ?? '{}'), author: doc.author, createdAt: doc.createdAt }));
  }

  // =========================================================================
  // Pain Scales
  // =========================================================================

  async recordPainScale(tenantId: string, nurseId: string, dto: PainScaleDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `[PAIN_SCALE:${dto.scaleType}] Score: ${dto.score}`,
        content: JSON.stringify({
          ...dto,
          assessedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async listPainScales(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: '[PAIN_SCALE:' } },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((doc) => ({ id: doc.id, ...JSON.parse(doc.content ?? '{}'), author: doc.author, createdAt: doc.createdAt }));
  }

  // =========================================================================
  // Elimination Tracking
  // =========================================================================

  async recordElimination(tenantId: string, nurseId: string, dto: EliminationTrackingDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `[ELIMINATION:${dto.type}]`,
        content: JSON.stringify({
          ...dto,
          recordedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async listEliminations(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: '[ELIMINATION:' } },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((doc) => ({ id: doc.id, ...JSON.parse(doc.content ?? '{}'), author: doc.author, createdAt: doc.createdAt }));
  }

  // =========================================================================
  // Admission Checklist
  // =========================================================================

  async createAdmissionChecklist(tenantId: string, nurseId: string, dto: AdmissionChecklistDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: nurseId,
        type: 'CUSTOM',
        title: '[ADMISSION_CHECKLIST]',
        content: JSON.stringify({
          ...dto,
          completedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  // =========================================================================
  // Repositioning Schedule
  // =========================================================================

  async recordRepositioning(tenantId: string, nurseId: string, dto: RepositioningDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `[REPOSITIONING] ${dto.position}`,
        content: JSON.stringify({
          position: dto.position,
          notes: dto.notes,
          recordedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async listRepositionings(tenantId: string, patientId: string, encounterId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, encounterId, title: { startsWith: '[REPOSITIONING]' } },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const records = docs.map((doc) => ({ id: doc.id, ...JSON.parse(doc.content ?? '{}'), author: doc.author, createdAt: doc.createdAt }));

    // Check if repositioning is overdue (>2h)
    const lastRecord = records[0];
    const isOverdue = lastRecord
      ? (Date.now() - new Date(lastRecord.recordedAt as string).getTime()) > 2 * 60 * 60 * 1000
      : true;

    return { records, isOverdue, nextDueAt: lastRecord ? new Date(new Date(lastRecord.recordedAt as string).getTime() + 2 * 60 * 60 * 1000).toISOString() : null };
  }

  // =========================================================================
  // Individualized Care Plan
  // =========================================================================

  async createCarePlan(tenantId: string, nurseId: string, dto: CarePlanDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: nurseId,
        type: 'CUSTOM',
        title: '[CARE_PLAN]',
        content: JSON.stringify({
          diagnosisId: dto.diagnosisId,
          interventions: dto.interventions,
          expectedOutcome: dto.expectedOutcome,
          evaluationDate: dto.evaluationDate,
          createdAt: new Date().toISOString(),
        }),
        status: 'DRAFT',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  // =========================================================================
  // Fugulin Patient Classification Scale
  // =========================================================================

  async assessFugulin(tenantId: string, nurseId: string, dto: FugulinDto) {
    const totalScore = dto.mentalState + dto.oxygenation + dto.vitalSigns +
      dto.motility + dto.ambulation + dto.feeding + dto.bodyCareSub +
      dto.elimination + dto.therapeutics + dto.skinIntegrity;

    let classification: string;
    if (totalScore >= 35) classification = 'INTENSIVE';
    else if (totalScore >= 27) classification = 'SEMI_INTENSIVE';
    else if (totalScore >= 18) classification = 'INTERMEDIATE';
    else classification = 'MINIMAL';

    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `[FUGULIN] Score: ${totalScore} - ${classification}`,
        content: JSON.stringify({
          ...dto,
          totalScore,
          classification,
          assessedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  // =========================================================================
  // Nursing Staffing Calculator (COFEN 543/2017)
  // =========================================================================

  calculateStaffing(dto: StaffingCalculatorDto) {
    // COFEN 543/2017 hours per patient/day
    const hoursPerPatient = {
      minimal: 4.0,
      intermediate: 5.6,
      semiIntensive: 9.4,
      intensive: 17.9,
    };

    const totalHours =
      dto.totalMinimal * hoursPerPatient.minimal +
      dto.totalIntermediate * hoursPerPatient.intermediate +
      dto.totalSemiIntensive * hoursPerPatient.semiIntensive +
      dto.totalIntensive * hoursPerPatient.intensive;

    // Work hours per professional per day: 6h
    const totalProfessionals = Math.ceil(totalHours / 6);

    // Distribution: 52% technicians, 33% nurses, 15% auxiliary
    const nurses = Math.ceil(totalProfessionals * 0.33);
    const technicians = Math.ceil(totalProfessionals * 0.52);
    const auxiliaries = Math.ceil(totalProfessionals * 0.15);

    // Per shift distribution
    const perShift = {
      morning: Math.ceil(totalProfessionals * 0.40),
      afternoon: Math.ceil(totalProfessionals * 0.35),
      night: Math.ceil(totalProfessionals * 0.25),
    };

    return {
      totalHoursNeeded: Math.round(totalHours * 10) / 10,
      totalProfessionals,
      distribution: { nurses, technicians, auxiliaries },
      perShift,
      patientCounts: {
        minimal: dto.totalMinimal,
        intermediate: dto.totalIntermediate,
        semiIntensive: dto.totalSemiIntensive,
        intensive: dto.totalIntensive,
      },
      reference: 'COFEN Resolução 543/2017',
    };
  }

  // =========================================================================
  // Nursing Work Schedule
  // =========================================================================

  async createScheduleEntry(tenantId: string, dto: WorkScheduleEntryDto) {
    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: 'SYSTEM', // non-patient document
        authorId: dto.nurseId,
        type: 'CUSTOM',
        title: `[WORK_SCHEDULE] ${dto.date} - ${dto.shiftType}`,
        content: JSON.stringify({
          nurseId: dto.nurseId,
          date: dto.date,
          shiftType: dto.shiftType,
          isOvertime: dto.isOvertime ?? false,
          swapWithNurseId: dto.swapWithNurseId,
          notes: dto.notes,
          createdAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
    });
  }

  async getScheduleForPeriod(tenantId: string, startDate: string, _endDate: string) {
    return this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[WORK_SCHEDULE]' },
        content: {
          contains: startDate.split('T')[0],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // =========================================================================
  // Catheter Bundles (Urinary + CVC)
  // =========================================================================

  async createCatheterBundle(tenantId: string, nurseId: string, dto: CatheterBundleDto) {
    const insertionDate = new Date(dto.insertionDate);
    const dwellDays = Math.floor((Date.now() - insertionDate.getTime()) / (24 * 60 * 60 * 1000));

    const alertThreshold = dto.catheterType === 'URINARY' ? 5 : 14;
    const isOverdue = dwellDays >= alertThreshold;

    return this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId: nurseId,
        type: 'CUSTOM',
        title: `[CATHETER_BUNDLE:${dto.catheterType}] Dia ${dwellDays}`,
        content: JSON.stringify({
          catheterType: dto.catheterType,
          insertionDate: dto.insertionDate,
          indication: dto.indication,
          dailyNecessityReviewed: dto.dailyNecessityReviewed ?? false,
          careChecklist: dto.careChecklist,
          dwellDays,
          isOverdue,
          alertMessage: isOverdue
            ? `ALERTA: Cateter ${dto.catheterType} com ${dwellDays} dias. Reavaliar necessidade.`
            : null,
          notes: dto.notes,
          assessedAt: new Date().toISOString(),
        }),
        status: 'FINAL',
      },
      include: { author: { select: { id: true, name: true } } },
    });
  }

  async listCatheterBundles(tenantId: string, patientId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, patientId, title: { startsWith: '[CATHETER_BUNDLE:' } },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map((doc) => ({ id: doc.id, ...JSON.parse(doc.content ?? '{}'), author: doc.author, createdAt: doc.createdAt }));
  }

  // =========================================================================
  // AI: Personalized Fall Risk Prediction (stub)
  // =========================================================================

  async aiFallRiskPrediction(tenantId: string, patientId: string) {
    // Stub: in production, this calls ML model
    return {
      patientId,
      predictedRisk: 'MODERATE',
      riskScore: 0.62,
      factors: [
        { factor: 'Uso de sedativos', weight: 0.25, present: true },
        { factor: 'Idade > 65 anos', weight: 0.20, present: true },
        { factor: 'Alteração laboratorial recente', weight: 0.10, present: false },
        { factor: 'Mobilidade reduzida', weight: 0.15, present: true },
        { factor: 'Período noturno', weight: 0.05, present: false },
      ],
      recommendations: [
        'Manter grades elevadas durante o período noturno',
        'Revisar necessidade de medicação sedativa',
        'Programar ronda a cada 2 horas',
      ],
      generatedAt: new Date().toISOString(),
      disclaimer: 'Predição assistida por IA — validação clínica obrigatória.',
    };
  }

  // =========================================================================
  // AI: Wound Deterioration Prediction (stub)
  // =========================================================================

  async aiWoundPrediction(tenantId: string, patientId: string) {
    // Stub: would analyze serial wound photos
    return {
      patientId,
      prediction: 'IMPROVING',
      healingRate: 0.85,
      estimatedHealingDays: 14,
      recommendations: [
        'Manter cobertura atual (espuma de poliuretano)',
        'Reavaliar em 48h',
        'Nutrição hiperproteica mantida',
      ],
      generatedAt: new Date().toISOString(),
      disclaimer: 'Predição assistida por IA — validação clínica obrigatória.',
    };
  }
}
