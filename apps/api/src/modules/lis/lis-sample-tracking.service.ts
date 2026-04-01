import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SampleCollectionDto,
  PhlebotomyWorklistQueryDto,
  PanicValueAcknowledgeDto,
  UpsertReferenceRangeDto,
  DeltaCheckQueryDto,
  ReflexTestingEvaluateDto,
  AutoVerificationDto,
  AutoVerificationStatus,
  AddOnTestDto,
  GasometryDto,
  BloodGasInterpretation,
  MicrobiologyDto,
  PocTestingDto,
  AgeGroup,
  BiologicalSex,
} from './dto/lis-sample-tracking.dto';

// ─── Internal Interfaces ──────────────────────────────────────────────────────

export interface SampleTrackingRecord {
  id: string;
  tenantId: string;
  patientId: string;
  orderId: string;
  tubeType: string;
  barcode: string;
  collectedBy: string;
  collectedAt: Date;
  location: string;
  fastingHours: number | null;
  volumeMl: number | null;
  notes: string | null;
  status: string;
  createdAt: Date;
}

export interface ReferenceRange {
  id: string;
  tenantId: string;
  testCode: string;
  ageGroup: string;
  sex: string;
  normalMin: number;
  normalMax: number;
  unit: string;
  criticalLow: number | null;
  criticalHigh: number | null;
  updatedAt: Date;
}

export interface DeltaCheckResult {
  testCode: string;
  patientId: string;
  previousResult: number | null;
  currentResult: number;
  percentChange: number | null;
  absoluteChange: number | null;
  flagged: boolean;
  thresholdPercent: number;
  interpretation: string;
}

export interface BloodGasResult {
  id: string;
  tenantId: string;
  patientId: string;
  encounterId: string | null;
  pH: number;
  pCO2: number;
  pO2: number;
  HCO3: number;
  BE: number;
  lactate: number | null;
  sO2: number | null;
  fiO2: number | null;
  paO2FiO2Ratio: number | null;
  interpretation: BloodGasInterpretation;
  interpretationText: string;
  operator: string | null;
  createdAt: Date;
}

export interface MicrobiologyReport {
  id: string;
  tenantId: string;
  patientId: string;
  encounterId: string | null;
  specimen: string;
  organism: string;
  antibiogram: MicrobiologyDto['antibiogram'];
  resistanceMechanisms: string[];
  colonyCount: number | null;
  incubationDays: number | null;
  reportedBy: string;
  createdAt: Date;
}

export interface PocResult {
  id: string;
  tenantId: string;
  patientId: string;
  encounterId: string | null;
  testType: string;
  deviceId: string;
  qcPassed: boolean;
  result: string;
  unit: string | null;
  operator: string;
  reagentLot: string | null;
  createdAt: Date;
}

export interface PanicAlert {
  id: string;
  tenantId: string;
  patientId: string;
  analyte: string;
  result: string;
  referenceRange: string;
  criticalThreshold: string;
  acknowledgedBy: string | null;
  acknowledgedAt: Date | null;
  readBackConfirmed: boolean;
  actionTaken: string | null;
  status: 'PENDING' | 'ACKNOWLEDGED';
  createdAt: Date;
}

// ─── Delta-check thresholds (% change that flags a swap/acute change) ─────────
const DELTA_THRESHOLDS: Record<string, number> = {
  K: 20,
  Na: 3,
  HGB: 10,
  PLT: 25,
  CREAT: 50,
  TROPONIN: 20,
  DEFAULT: 30,
};

@Injectable()
export class LisSampleTrackingService {
  private readonly logger = new Logger(LisSampleTrackingService.name);

  // In-memory stores (production: separate DB tables)
  private samples: SampleTrackingRecord[] = [];
  private referenceRanges: ReferenceRange[] = [];
  private panicAlerts: PanicAlert[] = [];
  private bloodGasResults: BloodGasResult[] = [];
  private microbiologyReports: MicrobiologyReport[] = [];
  private pocResults: PocResult[] = [];
  private addOnRequests: Array<{
    id: string;
    tenantId: string;
    sampleBarcode: string;
    additionalTests: string[];
    deadline: string | null;
    justification: string | null;
    requestedBy: string;
    status: string;
    createdAt: Date;
  }> = [];

  constructor(private readonly prisma: PrismaService) {
    this.seedDefaultReferenceRanges();
  }

  // ─── Sample Collection ──────────────────────────────────────────────────────

  async collectSample(tenantId: string, dto: SampleCollectionDto): Promise<SampleTrackingRecord> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente "${dto.patientId}" não encontrado`);
    }

    const duplicate = this.samples.find(
      (s) => s.barcode === dto.barcode && s.tenantId === tenantId,
    );
    if (duplicate) {
      throw new BadRequestException(`Código de barras "${dto.barcode}" já registrado`);
    }

    const record: SampleTrackingRecord = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      orderId: dto.orderId,
      tubeType: dto.tubeType,
      barcode: dto.barcode,
      collectedBy: dto.collectedBy,
      collectedAt: dto.collectedAt ? new Date(dto.collectedAt) : new Date(),
      location: dto.location,
      fastingHours: dto.fastingHours ?? null,
      volumeMl: dto.volumeMl ?? null,
      notes: dto.notes ?? null,
      status: 'COLLECTED',
      createdAt: new Date(),
    };

    this.samples.push(record);
    this.logger.log(`Sample collected: barcode=${dto.barcode} patient=${dto.patientId}`);

    return record;
  }

  async getSampleByBarcode(tenantId: string, barcode: string): Promise<SampleTrackingRecord> {
    const sample = this.samples.find((s) => s.barcode === barcode && s.tenantId === tenantId);
    if (!sample) {
      throw new NotFoundException(`Amostra com código "${barcode}" não encontrada`);
    }
    return sample;
  }

  // ─── Phlebotomy Worklist ────────────────────────────────────────────────────

  async getPhlebotomyWorklist(tenantId: string, query: PhlebotomyWorklistQueryDto) {
    // In production this queries pending exam orders filtered by unit/floor
    const pending = await this.prisma.examResult.findMany({
      where: {
        status: 'REQUESTED',
        patient: { tenantId },
        examType: 'LABORATORY',
      },
      include: {
        patient: {
          select: { id: true, fullName: true, mrn: true, birthDate: true },
        },
        requestedBy: { select: { id: true, name: true } },
      },
      orderBy: { requestedAt: 'asc' },
      take: 100,
    });

    return {
      unit: query.unit,
      floor: query.floor ?? null,
      fastingOnly: query.fastingOnly ?? false,
      generatedAt: new Date().toISOString(),
      totalPending: pending.length,
      items: pending.map((er) => ({
        examResultId: er.id,
        patient: er.patient,
        examName: er.examName,
        examType: er.examType,
        priority: 'ROUTINE',
        requestedAt: er.requestedAt,
        requestedBy: er.requestedBy,
        fastingRequired: er.examCode?.includes('GLICOSE_JEJUM') ?? false,
      })),
    };
  }

  // ─── Panic / Critical Values ────────────────────────────────────────────────

  async createPanicAlert(
    tenantId: string,
    patientId: string,
    analyte: string,
    result: string,
    referenceRange: string,
    criticalThreshold: string,
  ): Promise<PanicAlert> {
    const alert: PanicAlert = {
      id: crypto.randomUUID(),
      tenantId,
      patientId,
      analyte,
      result,
      referenceRange,
      criticalThreshold,
      acknowledgedBy: null,
      acknowledgedAt: null,
      readBackConfirmed: false,
      actionTaken: null,
      status: 'PENDING',
      createdAt: new Date(),
    };

    this.panicAlerts.push(alert);
    this.logger.warn(
      `PANIC VALUE: patient=${patientId} analyte=${analyte} result=${result}`,
    );

    return alert;
  }

  async acknowledgePanicAlert(
    tenantId: string,
    dto: PanicValueAcknowledgeDto,
  ): Promise<PanicAlert> {
    const alert = this.panicAlerts.find(
      (a) => a.id === dto.alertId && a.tenantId === tenantId,
    );
    if (!alert) {
      throw new NotFoundException(`Alerta de pânico "${dto.alertId}" não encontrado`);
    }
    if (alert.status === 'ACKNOWLEDGED') {
      throw new BadRequestException('Alerta já foi reconhecido');
    }
    if (!dto.readBackConfirmed) {
      throw new BadRequestException(
        'Read-back obrigatório: o médico deve repetir o valor crítico verbalmente',
      );
    }

    alert.acknowledgedBy = dto.acknowledgedBy;
    alert.acknowledgedAt = new Date();
    alert.readBackConfirmed = true;
    alert.actionTaken = dto.actionTaken ?? null;
    alert.status = 'ACKNOWLEDGED';

    return alert;
  }

  async getPendingPanicAlerts(tenantId: string): Promise<PanicAlert[]> {
    return this.panicAlerts.filter(
      (a) => a.tenantId === tenantId && a.status === 'PENDING',
    );
  }

  // ─── Reference Ranges ───────────────────────────────────────────────────────

  async upsertReferenceRange(tenantId: string, dto: UpsertReferenceRangeDto): Promise<ReferenceRange> {
    const existing = this.referenceRanges.find(
      (r) =>
        r.tenantId === tenantId &&
        r.testCode === dto.testCode &&
        r.ageGroup === dto.ageGroup &&
        r.sex === dto.sex,
    );

    if (existing) {
      Object.assign(existing, {
        normalMin: dto.normalMin,
        normalMax: dto.normalMax,
        unit: dto.unit,
        criticalLow: dto.criticalLow ?? null,
        criticalHigh: dto.criticalHigh ?? null,
        updatedAt: new Date(),
      });
      return existing;
    }

    const range: ReferenceRange = {
      id: crypto.randomUUID(),
      tenantId,
      testCode: dto.testCode,
      ageGroup: dto.ageGroup,
      sex: dto.sex,
      normalMin: dto.normalMin,
      normalMax: dto.normalMax,
      unit: dto.unit,
      criticalLow: dto.criticalLow ?? null,
      criticalHigh: dto.criticalHigh ?? null,
      updatedAt: new Date(),
    };

    this.referenceRanges.push(range);
    return range;
  }

  async getReferenceRanges(tenantId: string, testCode?: string): Promise<ReferenceRange[]> {
    return this.referenceRanges.filter(
      (r) => r.tenantId === tenantId && (!testCode || r.testCode === testCode),
    );
  }

  // ─── Delta Check ────────────────────────────────────────────────────────────

  async performDeltaCheck(tenantId: string, dto: DeltaCheckQueryDto): Promise<DeltaCheckResult> {
    const threshold = DELTA_THRESHOLDS[dto.testCode.toUpperCase()] ?? DELTA_THRESHOLDS.DEFAULT;

    let previousResult = dto.previousResult ?? null;

    // If not provided, look up previous result from clinical documents / exam results
    if (previousResult === null) {
      const previous = await this.prisma.examResult.findFirst({
        where: {
          patientId: dto.patientId,
          examCode: dto.testCode,
          status: 'COMPLETED',
          patient: { tenantId },
        },
        orderBy: { completedAt: 'desc' },
        select: { labResults: true },
      });
      // Extract numeric value from labResults JSON if available
      if (previous?.labResults && typeof previous.labResults === 'object' && !Array.isArray(previous.labResults)) {
        const labObj = previous.labResults as Record<string, unknown>;
        const val = labObj['value'] ?? labObj['numericValue'];
        if (typeof val === 'number') previousResult = val;
      }
    }

    if (previousResult === null) {
      return {
        testCode: dto.testCode,
        patientId: dto.patientId,
        previousResult: null,
        currentResult: dto.currentResult,
        percentChange: null,
        absoluteChange: null,
        flagged: false,
        thresholdPercent: threshold,
        interpretation: 'Sem resultado anterior disponível para comparação delta',
      };
    }

    const absoluteChange = dto.currentResult - previousResult;
    const percentChange =
      previousResult !== 0
        ? Math.abs((absoluteChange / previousResult) * 100)
        : null;

    const flagged = percentChange !== null && percentChange >= threshold;

    return {
      testCode: dto.testCode,
      patientId: dto.patientId,
      previousResult,
      currentResult: dto.currentResult,
      percentChange: percentChange !== null ? Math.round(percentChange * 10) / 10 : null,
      absoluteChange: Math.round(absoluteChange * 100) / 100,
      flagged,
      thresholdPercent: threshold,
      interpretation: flagged
        ? `ALERTA DELTA: variação de ${percentChange?.toFixed(1)}% excede limiar de ${threshold}% — suspeita de troca de amostra ou deterioração aguda`
        : 'Variação dentro do esperado',
    };
  }

  // ─── Reflex Testing ─────────────────────────────────────────────────────────

  async evaluateReflexRules(
    tenantId: string,
    dto: ReflexTestingEvaluateDto,
  ): Promise<{
    triggered: boolean;
    reflexTests: string[];
    rationale: string;
    autoOrdered: boolean;
  }> {
    const sample = this.samples.find(
      (s) => s.barcode === dto.sampleBarcode && s.tenantId === tenantId,
    );
    if (!sample) {
      throw new NotFoundException(`Amostra "${dto.sampleBarcode}" não encontrada`);
    }

    // Built-in reflex rules (in production these are configurable per tenant)
    const builtinRules: Array<{
      trigger: string;
      condition: (v: number) => boolean;
      reflex: string;
      rationale: string;
    }> = [
      {
        trigger: 'TSH',
        condition: (v) => v < 0.4 || v > 4.0,
        reflex: 'T4L',
        rationale: 'TSH fora do intervalo normal → reflexo T4 livre',
      },
      {
        trigger: 'ALBUMIN',
        condition: (v) => v < 2.5,
        reflex: 'PREALBUMIN',
        rationale: 'Albumina baixa → pré-albumina para avaliar estado nutricional agudo',
      },
      {
        trigger: 'CREAT',
        condition: (v) => v > 1.5,
        reflex: 'CYSTATINC',
        rationale: 'Creatinina elevada → cistatina C para TFG mais acurada',
      },
      {
        trigger: 'ALP',
        condition: (v) => v > 120,
        reflex: 'GGT',
        rationale: 'Fosfatase alcalina elevada → GGT para diferenciar origem hepática vs óssea',
      },
      {
        trigger: 'HEMATOCRIT',
        condition: (v) => v < 25,
        reflex: 'RETIC',
        rationale: 'Hematócrito baixo → contagem de reticulócitos para investigar anemia',
      },
    ];

    const triggered = builtinRules.filter(
      (r) => r.trigger === dto.triggerTest.toUpperCase() && r.condition(dto.triggerResult),
    );

    if (triggered.length === 0) {
      return {
        triggered: false,
        reflexTests: [],
        rationale: `Nenhuma regra de reflexo disparada para ${dto.triggerTest}=${dto.triggerResult}`,
        autoOrdered: false,
      };
    }

    const reflexTests = triggered.map((r) => r.reflex);
    const rationale = triggered.map((r) => r.rationale).join('; ');

    return {
      triggered: true,
      reflexTests,
      rationale,
      autoOrdered: true,
    };
  }

  // ─── Auto-Verification ──────────────────────────────────────────────────────

  async autoVerify(
    tenantId: string,
    dto: AutoVerificationDto,
  ): Promise<{
    status: AutoVerificationStatus;
    message: string;
    released: boolean;
  }> {
    const range = this.referenceRanges.find(
      (r) =>
        r.tenantId === tenantId &&
        r.testCode === dto.testCode &&
        r.ageGroup === AgeGroup.ADULT &&
        r.sex === BiologicalSex.OTHER,
    );

    if (dto.instrumentFlags && dto.instrumentFlags.length > 0) {
      return {
        status: AutoVerificationStatus.INSTRUMENT_FLAG,
        message: `Flags do analisador requerem revisão manual: ${dto.instrumentFlags.join(', ')}`,
        released: false,
      };
    }

    if (!range) {
      return {
        status: AutoVerificationStatus.REVIEW_REQUIRED,
        message: 'Intervalo de referência não configurado — revisão manual necessária',
        released: false,
      };
    }

    if (range.criticalLow !== null && dto.result <= range.criticalLow) {
      await this.createPanicAlert(
        tenantId,
        dto.patientId,
        dto.testCode,
        String(dto.result),
        `${range.normalMin}–${range.normalMax} ${range.unit}`,
        `Crítico baixo: ${range.criticalLow}`,
      );
      return {
        status: AutoVerificationStatus.PANIC_VALUE,
        message: `VALOR DE PÂNICO BAIXO: ${dto.result} ≤ ${range.criticalLow} ${range.unit}`,
        released: false,
      };
    }

    if (range.criticalHigh !== null && dto.result >= range.criticalHigh) {
      await this.createPanicAlert(
        tenantId,
        dto.patientId,
        dto.testCode,
        String(dto.result),
        `${range.normalMin}–${range.normalMax} ${range.unit}`,
        `Crítico alto: ${range.criticalHigh}`,
      );
      return {
        status: AutoVerificationStatus.PANIC_VALUE,
        message: `VALOR DE PÂNICO ALTO: ${dto.result} ≥ ${range.criticalHigh} ${range.unit}`,
        released: false,
      };
    }

    const withinNormal = dto.result >= range.normalMin && dto.result <= range.normalMax;
    if (withinNormal) {
      return {
        status: AutoVerificationStatus.AUTO_RELEASED,
        message: `Liberação automática: ${dto.result} ${range.unit} dentro de [${range.normalMin}–${range.normalMax}]`,
        released: true,
      };
    }

    return {
      status: AutoVerificationStatus.REVIEW_REQUIRED,
      message: `Resultado ${dto.result} ${range.unit} fora do normal [${range.normalMin}–${range.normalMax}] — revisão manual`,
      released: false,
    };
  }

  // ─── Add-on Testing ─────────────────────────────────────────────────────────

  async requestAddOnTests(tenantId: string, dto: AddOnTestDto) {
    const sample = this.samples.find(
      (s) => s.barcode === dto.sampleBarcode && s.tenantId === tenantId,
    );
    if (!sample) {
      throw new NotFoundException(`Amostra "${dto.sampleBarcode}" não encontrada`);
    }

    if (dto.deadline) {
      const deadline = new Date(dto.deadline);
      if (deadline < new Date()) {
        throw new BadRequestException('Prazo de estabilidade da amostra já expirou');
      }
    }

    const addOn = {
      id: crypto.randomUUID(),
      tenantId,
      sampleBarcode: dto.sampleBarcode,
      additionalTests: dto.additionalTests,
      deadline: dto.deadline ?? null,
      justification: dto.justification ?? null,
      requestedBy: dto.requestedBy,
      status: 'PENDING',
      createdAt: new Date(),
    };

    this.addOnRequests.push(addOn);
    return addOn;
  }

  // ─── Blood Gas ───────────────────────────────────────────────────────────────

  async recordBloodGas(tenantId: string, dto: GasometryDto): Promise<BloodGasResult> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente "${dto.patientId}" não encontrado`);
    }

    const interpretation = this.interpretBloodGas(dto.pH, dto.pCO2, dto.HCO3, dto.BE);
    const paO2FiO2Ratio =
      dto.fiO2 && dto.fiO2 > 0 ? Math.round(dto.pO2 / dto.fiO2) : null;

    const result: BloodGasResult = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      pH: dto.pH,
      pCO2: dto.pCO2,
      pO2: dto.pO2,
      HCO3: dto.HCO3,
      BE: dto.BE,
      lactate: dto.lactate ?? null,
      sO2: dto.sO2 ?? null,
      fiO2: dto.fiO2 ?? null,
      paO2FiO2Ratio,
      interpretation: interpretation.code,
      interpretationText: interpretation.text,
      operator: dto.operator ?? null,
      createdAt: new Date(),
    };

    this.bloodGasResults.push(result);

    // Warn on severe lactate
    if (dto.lactate && dto.lactate >= 4.0) {
      this.logger.warn(
        `LACTATO CRÍTICO: patient=${dto.patientId} lactate=${dto.lactate} mmol/L`,
      );
    }

    return result;
  }

  private interpretBloodGas(
    pH: number,
    pCO2: number,
    HCO3: number,
    BE: number,
  ): { code: BloodGasInterpretation; text: string } {
    const acidemia = pH < 7.35;
    const alkalemia = pH > 7.45;
    const highCO2 = pCO2 > 45;
    const lowCO2 = pCO2 < 35;
    const lowHCO3 = HCO3 < 22;
    const highHCO3 = HCO3 > 26;

    if (!acidemia && !alkalemia) {
      return { code: BloodGasInterpretation.NORMAL, text: 'Gasometria dentro dos parâmetros normais' };
    }

    if (acidemia && highCO2 && !lowHCO3) {
      return {
        code: BloodGasInterpretation.RESPIRATORY_ACIDOSIS,
        text: 'Acidose respiratória: pH baixo, pCO2 elevado. Hipoventilação.',
      };
    }
    if (acidemia && highCO2 && highHCO3) {
      return {
        code: BloodGasInterpretation.COMPENSATED_RESPIRATORY_ACIDOSIS,
        text: 'Acidose respiratória compensada: HCO3 elevado como compensação metabólica renal.',
      };
    }
    if (acidemia && lowHCO3 && BE < -3) {
      return {
        code: BloodGasInterpretation.METABOLIC_ACIDOSIS,
        text: 'Acidose metabólica: pH baixo, HCO3 baixo, BE negativo. Calcular anion gap.',
      };
    }
    if (acidemia && lowHCO3 && lowCO2) {
      return {
        code: BloodGasInterpretation.COMPENSATED_METABOLIC_ACIDOSIS,
        text: 'Acidose metabólica compensada: hiperventilação reduz pCO2 (respiração de Kussmaul).',
      };
    }
    if (alkalemia && lowCO2 && !highHCO3) {
      return {
        code: BloodGasInterpretation.RESPIRATORY_ALKALOSIS,
        text: 'Alcalose respiratória: pH alto, pCO2 baixo. Hiperventilação.',
      };
    }
    if (alkalemia && lowCO2 && lowHCO3) {
      return {
        code: BloodGasInterpretation.COMPENSATED_RESPIRATORY_ALKALOSIS,
        text: 'Alcalose respiratória compensada: redução de HCO3 por compensação renal.',
      };
    }
    if (alkalemia && highHCO3 && BE > 3) {
      return {
        code: BloodGasInterpretation.METABOLIC_ALKALOSIS,
        text: 'Alcalose metabólica: pH alto, HCO3 elevado, BE positivo.',
      };
    }
    if (alkalemia && highHCO3 && highCO2) {
      return {
        code: BloodGasInterpretation.COMPENSATED_METABOLIC_ALKALOSIS,
        text: 'Alcalose metabólica compensada: retenção de CO2 como compensação respiratória.',
      };
    }

    return {
      code: BloodGasInterpretation.MIXED_DISORDER,
      text: 'Distúrbio misto: combinação de alterações. Avaliação clínica detalhada necessária.',
    };
  }

  async getBloodGasHistory(tenantId: string, patientId: string): Promise<BloodGasResult[]> {
    return this.bloodGasResults
      .filter((r) => r.tenantId === tenantId && r.patientId === patientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ─── Microbiology ────────────────────────────────────────────────────────────

  async recordMicrobiology(tenantId: string, dto: MicrobiologyDto): Promise<MicrobiologyReport> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente "${dto.patientId}" não encontrado`);
    }

    const report: MicrobiologyReport = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      specimen: dto.specimen,
      organism: dto.organism,
      antibiogram: dto.antibiogram,
      resistanceMechanisms: dto.resistanceMechanisms,
      colonyCount: dto.colonyCount ?? null,
      incubationDays: dto.incubationDays ?? null,
      reportedBy: dto.reportedBy,
      createdAt: new Date(),
    };

    this.microbiologyReports.push(report);

    // Alert on multi-drug resistant organisms
    const mdrMechanisms = ['ESBL', 'KPC', 'MBL', 'MRSA', 'VRE', 'CRKP'];
    const mdrDetected = dto.resistanceMechanisms.some((m) => mdrMechanisms.includes(m));
    if (mdrDetected) {
      this.logger.warn(
        `MRDO DETECTADO: patient=${dto.patientId} organism=${dto.organism} mechanisms=${dto.resistanceMechanisms.join(',')}`,
      );
    }

    return report;
  }

  async getMicrobiologyByPatient(tenantId: string, patientId: string): Promise<MicrobiologyReport[]> {
    return this.microbiologyReports
      .filter((r) => r.tenantId === tenantId && r.patientId === patientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ─── Point-of-Care Testing ───────────────────────────────────────────────────

  async recordPocTest(tenantId: string, dto: PocTestingDto): Promise<PocResult> {
    if (!dto.qcPassed) {
      throw new BadRequestException(
        'Controle de qualidade do dispositivo POC não aprovado. Realize o QC antes do teste.',
      );
    }

    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente "${dto.patientId}" não encontrado`);
    }

    const result: PocResult = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      testType: dto.testType,
      deviceId: dto.deviceId,
      qcPassed: dto.qcPassed,
      result: dto.result,
      unit: dto.unit ?? null,
      operator: dto.operator,
      reagentLot: dto.reagentLot ?? null,
      createdAt: new Date(),
    };

    this.pocResults.push(result);
    return result;
  }

  async getPocResultsByPatient(tenantId: string, patientId: string): Promise<PocResult[]> {
    return this.pocResults
      .filter((r) => r.tenantId === tenantId && r.patientId === patientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ─── Seed default reference ranges ──────────────────────────────────────────

  private seedDefaultReferenceRanges(): void {
    const defaults: Array<{
      testCode: string;
      ageGroup: AgeGroup;
      sex: BiologicalSex;
      normalMin: number;
      normalMax: number;
      unit: string;
      criticalLow?: number;
      criticalHigh?: number;
    }> = [
      { testCode: 'K', ageGroup: AgeGroup.ADULT, sex: BiologicalSex.OTHER, normalMin: 3.5, normalMax: 5.0, unit: 'mEq/L', criticalLow: 2.5, criticalHigh: 6.5 },
      { testCode: 'Na', ageGroup: AgeGroup.ADULT, sex: BiologicalSex.OTHER, normalMin: 136, normalMax: 145, unit: 'mEq/L', criticalLow: 120, criticalHigh: 160 },
      { testCode: 'CREAT', ageGroup: AgeGroup.ADULT, sex: BiologicalSex.MALE, normalMin: 0.7, normalMax: 1.3, unit: 'mg/dL', criticalHigh: 10 },
      { testCode: 'CREAT', ageGroup: AgeGroup.ADULT, sex: BiologicalSex.FEMALE, normalMin: 0.5, normalMax: 1.1, unit: 'mg/dL', criticalHigh: 10 },
      { testCode: 'GLUCOSE', ageGroup: AgeGroup.ADULT, sex: BiologicalSex.OTHER, normalMin: 70, normalMax: 99, unit: 'mg/dL', criticalLow: 40, criticalHigh: 500 },
      { testCode: 'HGB', ageGroup: AgeGroup.ADULT, sex: BiologicalSex.MALE, normalMin: 13.5, normalMax: 17.5, unit: 'g/dL', criticalLow: 7.0 },
      { testCode: 'HGB', ageGroup: AgeGroup.ADULT, sex: BiologicalSex.FEMALE, normalMin: 12.0, normalMax: 16.0, unit: 'g/dL', criticalLow: 7.0 },
      { testCode: 'PLT', ageGroup: AgeGroup.ADULT, sex: BiologicalSex.OTHER, normalMin: 150, normalMax: 400, unit: 'x10³/μL', criticalLow: 20, criticalHigh: 1000 },
      { testCode: 'INR', ageGroup: AgeGroup.ADULT, sex: BiologicalSex.OTHER, normalMin: 0.8, normalMax: 1.2, unit: '', criticalHigh: 4.0 },
      { testCode: 'TROPONIN', ageGroup: AgeGroup.ADULT, sex: BiologicalSex.OTHER, normalMin: 0, normalMax: 0.04, unit: 'ng/mL', criticalHigh: 1.0 },
    ];

    for (const d of defaults) {
      this.referenceRanges.push({
        id: crypto.randomUUID(),
        tenantId: '__system__',
        ...d,
        criticalLow: d.criticalLow ?? null,
        criticalHigh: d.criticalHigh ?? null,
        updatedAt: new Date(),
      });
    }
  }
}
