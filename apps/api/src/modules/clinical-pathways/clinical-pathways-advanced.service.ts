import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';
import {
  MedicalCalculatorType,
  ProtocolDeviationSeverity,
  ComplianceStatus,
  type MedicalCalculatorDto,
  type MedicalCalculatorResultDto,
  type ClinicalPathwayDto,
  type ComplianceChecklistDto,
  type ProtocolDeviationDto,
} from './dto/clinical-pathways-advanced.dto';

// ─── In-memory stores (production: use Prisma models) ────────────────────────

export interface StoredPathwayEntry extends ClinicalPathwayDto {
  tenantId: string;
  entryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredChecklist extends ComplianceChecklistDto {
  tenantId: string;
  checklistId: string;
  overallCompliance: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredDeviation extends ProtocolDeviationDto {
  tenantId: string;
  deviationId: string;
  alertSent: boolean;
  auditRecord: string;
  createdAt: string;
}

export interface StoredCalculation extends MedicalCalculatorResultDto {
  tenantId: string;
  calculationId: string;
  patientId?: string;
  encounterId?: string;
}

// ─── Calculator logic helpers ─────────────────────────────────────────────────

type CalcInputs = Record<string, number | boolean | string>;

function toNum(v: unknown): number {
  if (typeof v === 'boolean') return v ? 1 : 0;
  return Number(v) || 0;
}

function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  return v === 1 || v === '1' || v === 'true';
}

@Injectable()
export class ClinicalPathwaysAdvancedService {
  private readonly logger = new Logger(ClinicalPathwaysAdvancedService.name);

  private readonly pathwayEntries: StoredPathwayEntry[] = [];
  private readonly checklists: StoredChecklist[] = [];
  private readonly deviations: StoredDeviation[] = [];
  private readonly calculations: StoredCalculation[] = [];

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. MEDICAL CALCULATORS
  // ═══════════════════════════════════════════════════════════════════════════

  async calculate(
    tenantId: string,
    dto: MedicalCalculatorDto,
  ): Promise<StoredCalculation> {
    this.logger.log(`Calculating ${dto.calculatorType} for tenant=${tenantId}`);

    let inputs = { ...dto.inputs };

    // Auto-populate from patient data if patientId provided
    if (dto.patientId) {
      inputs = await this.enrichInputsFromPatient(tenantId, dto.patientId, dto.calculatorType, inputs);
    }

    const result = this.computeCalculator(dto.calculatorType, inputs);

    const stored: StoredCalculation = {
      tenantId,
      calculationId: randomUUID(),
      calculatorType: dto.calculatorType,
      result: result.score,
      interpretation: result.interpretation,
      riskCategory: result.riskCategory,
      recommendation: result.recommendation,
      guidelineSource: result.guidelineSource,
      calculatedAt: new Date().toISOString(),
      inputs,
      patientId: dto.patientId,
      encounterId: dto.encounterId,
    };

    this.calculations.push(stored);
    return stored;
  }

  async listCalculations(
    tenantId: string,
    patientId?: string,
    calculatorType?: MedicalCalculatorType,
  ): Promise<StoredCalculation[]> {
    return this.calculations.filter(
      (c) =>
        c.tenantId === tenantId &&
        (patientId === undefined || c.patientId === patientId) &&
        (calculatorType === undefined || c.calculatorType === calculatorType),
    );
  }

  private async enrichInputsFromPatient(
    tenantId: string,
    patientId: string,
    calculatorType: MedicalCalculatorType,
    existing: CalcInputs,
  ): Promise<CalcInputs> {
    try {
      const patient = await this.prisma.patient.findFirst({
        where: { id: patientId, tenantId },
      });

      if (!patient) return existing;

      const enriched = { ...existing };

      // Age auto-population
      if (patient.birthDate && enriched.age === undefined) {
        const birth = new Date(patient.birthDate);
        const ageDiff = Date.now() - birth.getTime();
        enriched.age = Math.floor(ageDiff / (365.25 * 24 * 60 * 60 * 1000));
      }

      // Sex / gender auto-population
      if (patient.gender && enriched.sex === undefined) {
        enriched.sex = patient.gender;
      }

      return enriched;
    } catch {
      return existing;
    }
  }

  private computeCalculator(
    type: MedicalCalculatorType,
    inputs: CalcInputs,
  ): {
    score: number | string;
    interpretation: string;
    riskCategory: string;
    recommendation?: string;
    guidelineSource?: string;
  } {
    switch (type) {
      case MedicalCalculatorType.CHADS2VASC: {
        let score = 0;
        if (toBool(inputs.congestiveHeartFailure)) score++;
        if (toBool(inputs.hypertension)) score++;
        const age = toNum(inputs.age);
        if (age >= 75) score += 2;
        else if (age >= 65) score++;
        if (toBool(inputs.diabetes)) score++;
        if (toBool(inputs.stroke) || toBool(inputs.tia)) score += 2;
        if (toBool(inputs.vascularDisease)) score++;
        if (inputs.sex === 'F' || inputs.sex === 'FEMALE') score++;

        const riskMap: Record<number, string> = {
          0: 'Baixo risco',
          1: 'Risco moderado — considere anticoagulação',
        };
        const risk = score >= 2 ? 'Alto risco' : (riskMap[score] ?? 'Alto risco');

        return {
          score,
          interpretation: `CHA₂DS₂-VASc = ${score} — ${risk}`,
          riskCategory: score === 0 ? 'LOW' : score === 1 ? 'INTERMEDIATE' : 'HIGH',
          recommendation:
            score >= 2
              ? 'Anticoagulação oral recomendada (ACC/AHA 2023)'
              : score === 1
              ? 'Avaliar risco vs benefício de anticoagulação'
              : 'Anticoagulação geralmente não recomendada',
          guidelineSource: 'ACC/AHA 2023 AF Guidelines',
        };
      }

      case MedicalCalculatorType.CURB65: {
        let score = 0;
        if (toBool(inputs.confusion)) score++;
        if (toNum(inputs.bun) > 7) score++;  // >7 mmol/L
        if (toNum(inputs.rr) >= 30) score++;
        if (toNum(inputs.sbp) < 90 || toNum(inputs.dbp) <= 60) score++;
        if (toNum(inputs.age) >= 65) score++;

        const risk = score <= 1 ? 'LOW' : score <= 2 ? 'INTERMEDIATE' : 'HIGH';
        return {
          score,
          interpretation: `CURB-65 = ${score}`,
          riskCategory: risk,
          recommendation:
            score <= 1
              ? 'Tratamento ambulatorial possível'
              : score === 2
              ? 'Internação hospitalar recomendada'
              : 'Internação em UTI considerar',
          guidelineSource: 'BTS Guidelines for CAP',
        };
      }

      case MedicalCalculatorType.MELD: {
        const creatinine = Math.min(toNum(inputs.creatinine), 4.0);
        const bilirubin = toNum(inputs.bilirubin);
        const inr = toNum(inputs.inr);
        const sodium = Math.max(Math.min(toNum(inputs.sodium), 137), 125);

        const meld =
          3.78 * Math.log(bilirubin) +
          11.2 * Math.log(inr) +
          9.57 * Math.log(creatinine) +
          6.43;

        const meldNa =
          meld +
          1.32 * (137 - sodium) -
          0.033 * meld * (137 - sodium);

        const score = Math.round(meldNa);
        const risk = score < 10 ? 'LOW' : score < 20 ? 'INTERMEDIATE' : 'HIGH';

        return {
          score,
          interpretation: `MELD-Na = ${score} (3-month mortality estimate)`,
          riskCategory: risk,
          recommendation:
            score >= 15
              ? 'Avaliar para transplante hepático'
              : 'Monitoramento clínico contínuo',
          guidelineSource: 'UNOS MELD-Na',
        };
      }

      case MedicalCalculatorType.SOFA: {
        let score = 0;
        // PaO2/FiO2
        const pf = toNum(inputs.paoFio2);
        if (pf < 100) score += 4;
        else if (pf < 200) score += 3;
        else if (pf < 300) score += 2;
        else if (pf < 400) score++;
        // GCS
        const gcs = toNum(inputs.gcs);
        if (gcs < 6) score += 4;
        else if (gcs < 10) score += 3;
        else if (gcs < 13) score += 2;
        else if (gcs < 15) score++;
        // Bilirubin
        const bili = toNum(inputs.bilirubin);
        if (bili >= 12) score += 4;
        else if (bili >= 6) score += 3;
        else if (bili >= 2) score += 2;
        else if (bili >= 1.2) score++;
        // Creatinine
        const creat = toNum(inputs.creatinine);
        if (creat >= 5) score += 4;
        else if (creat >= 3.5) score += 3;
        else if (creat >= 2) score += 2;
        else if (creat >= 1.2) score++;

        const risk = score < 7 ? 'LOW' : score < 11 ? 'INTERMEDIATE' : 'HIGH';
        return {
          score,
          interpretation: `SOFA = ${score}`,
          riskCategory: risk,
          recommendation:
            score >= 2
              ? 'Suspeita de sepse — iniciar protocolo'
              : 'Monitorar evolução clínica',
          guidelineSource: 'SEPSIS-3 Definitions',
        };
      }

      case MedicalCalculatorType.GCS: {
        const eye = Math.max(1, Math.min(4, toNum(inputs.eyeOpening)));
        const verbal = Math.max(1, Math.min(5, toNum(inputs.verbalResponse)));
        const motor = Math.max(1, Math.min(6, toNum(inputs.motorResponse)));
        const score = eye + verbal + motor;

        return {
          score,
          interpretation: `GCS = ${score} (E${eye}V${verbal}M${motor})`,
          riskCategory: score >= 14 ? 'LOW' : score >= 9 ? 'INTERMEDIATE' : 'HIGH',
          recommendation:
            score <= 8
              ? 'Intubação traqueal indicada — via aérea em risco'
              : 'Monitoramento neurológico frequente',
          guidelineSource: 'Teasdale & Jennett, 1974',
        };
      }

      default: {
        // Generic fallback for calculators not yet fully implemented
        return {
          score: 'N/A',
          interpretation: `Calculadora ${type} — resultado simulado`,
          riskCategory: 'UNKNOWN',
          recommendation: 'Consulte guideline específico para este escore',
          guidelineSource: 'Protocolo institucional',
        };
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CLINICAL PATHWAYS
  // ═══════════════════════════════════════════════════════════════════════════

  async upsertPathwayEntry(
    tenantId: string,
    dto: ClinicalPathwayDto,
  ): Promise<StoredPathwayEntry> {
    this.logger.log(
      `Upserting pathway: pathwayId=${dto.pathwayId} patient=${dto.patientId} day=${dto.day}`,
    );

    const existing = this.pathwayEntries.find(
      (e) =>
        e.tenantId === tenantId &&
        e.encounterId === dto.encounterId &&
        e.pathwayId === dto.pathwayId &&
        e.day === dto.day,
    );

    if (existing) {
      Object.assign(existing, dto, { updatedAt: new Date().toISOString() });
      return existing;
    }

    const entry: StoredPathwayEntry = {
      tenantId,
      entryId: randomUUID(),
      ...dto,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.pathwayEntries.push(entry);
    return entry;
  }

  async getPathwayProgress(
    tenantId: string,
    encounterId: string,
    pathwayId: string,
  ): Promise<{
    entries: StoredPathwayEntry[];
    currentDay: number;
    dischargeCriteriaMet: boolean;
    totalVariances: number;
  }> {
    const entries = this.pathwayEntries.filter(
      (e) =>
        e.tenantId === tenantId &&
        e.encounterId === encounterId &&
        e.pathwayId === pathwayId,
    );

    if (entries.length === 0) {
      throw new NotFoundException(`Pathway ${pathwayId} not found for encounter ${encounterId}`);
    }

    const currentDay = Math.max(...entries.map((e) => e.day));
    const latestEntry = entries.find((e) => e.day === currentDay)!;

    const dischargeCriteriaMet = latestEntry.dischargeCriteria.every((c) => c.met);
    const totalVariances = entries.reduce(
      (sum, e) => sum + (e.varianceTracking?.length ?? 0),
      0,
    );

    return { entries, currentDay, dischargeCriteriaMet, totalVariances };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. PROTOCOL COMPLIANCE CHECKLISTS
  // ═══════════════════════════════════════════════════════════════════════════

  async createChecklist(
    tenantId: string,
    dto: ComplianceChecklistDto,
  ): Promise<StoredChecklist> {
    this.logger.log(
      `Creating compliance checklist: protocolId=${dto.protocolId} patient=${dto.patientId}`,
    );

    const compliant = dto.checklistItems.filter(
      (i) => i.status === ComplianceStatus.COMPLIANT,
    ).length;
    const applicable = dto.checklistItems.filter(
      (i) => i.status !== ComplianceStatus.NOT_APPLICABLE,
    ).length;
    const overallCompliance = applicable > 0 ? Math.round((compliant / applicable) * 100) : 100;

    const checklist: StoredChecklist = {
      tenantId,
      checklistId: randomUUID(),
      ...dto,
      overallCompliance,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.checklists.push(checklist);
    return checklist;
  }

  async getComplianceStats(
    tenantId: string,
    protocolId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    protocolId: string;
    totalChecks: number;
    averageCompliance: number;
    fullyCompliant: number;
    nonCompliant: number;
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  }> {
    let checklists = this.checklists.filter(
      (c) => c.tenantId === tenantId && c.protocolId === protocolId,
    );

    if (startDate) {
      checklists = checklists.filter(
        (c) => new Date(c.createdAt) >= new Date(startDate),
      );
    }
    if (endDate) {
      checklists = checklists.filter(
        (c) => new Date(c.createdAt) <= new Date(endDate),
      );
    }

    if (checklists.length === 0) {
      return {
        protocolId,
        totalChecks: 0,
        averageCompliance: 0,
        fullyCompliant: 0,
        nonCompliant: 0,
        trend: 'STABLE',
      };
    }

    const averageCompliance =
      Math.round(
        checklists.reduce((sum, c) => sum + c.overallCompliance, 0) / checklists.length,
      );

    const fullyCompliant = checklists.filter((c) => c.overallCompliance === 100).length;
    const nonCompliant = checklists.filter((c) => c.overallCompliance < 80).length;

    // Simple trend: compare last 3 vs previous 3
    const sorted = [...checklists].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    let trend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
    if (sorted.length >= 6) {
      const recent = sorted.slice(-3).reduce((s, c) => s + c.overallCompliance, 0) / 3;
      const previous = sorted.slice(-6, -3).reduce((s, c) => s + c.overallCompliance, 0) / 3;
      if (recent > previous + 5) trend = 'IMPROVING';
      else if (recent < previous - 5) trend = 'DECLINING';
    }

    return { protocolId, totalChecks: checklists.length, averageCompliance, fullyCompliant, nonCompliant, trend };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. PROTOCOL DEVIATION ALERTS
  // ═══════════════════════════════════════════════════════════════════════════

  async reportDeviation(
    tenantId: string,
    dto: ProtocolDeviationDto,
  ): Promise<StoredDeviation> {
    this.logger.log(
      `Protocol deviation reported: protocolId=${dto.protocolId} severity=${dto.severity}`,
    );

    if (!dto.justification || dto.justification.trim().length < 10) {
      throw new BadRequestException(
        'Justificativa obrigatória para desvio de protocolo (mínimo 10 caracteres)',
      );
    }

    const deviationId = randomUUID();
    const auditRecord = JSON.stringify({
      deviationId,
      tenantId,
      protocolId: dto.protocolId,
      prescriptionId: dto.prescriptionId,
      severity: dto.severity,
      justification: dto.justification,
      timestamp: new Date().toISOString(),
    });

    const deviation: StoredDeviation = {
      tenantId,
      deviationId,
      ...dto,
      alertSent: dto.severity !== ProtocolDeviationSeverity.MINOR,
      auditRecord,
      createdAt: new Date().toISOString(),
    };

    this.deviations.push(deviation);

    if (deviation.alertSent) {
      this.logger.warn(
        `DEVIATION ALERT: ${dto.severity} deviation from protocol ${dto.protocolId} — ${dto.deviation}`,
      );
    }

    return deviation;
  }

  async listDeviations(
    tenantId: string,
    protocolId?: string,
    encounterId?: string,
  ): Promise<StoredDeviation[]> {
    return this.deviations.filter(
      (d) =>
        d.tenantId === tenantId &&
        (protocolId === undefined || d.protocolId === protocolId) &&
        (encounterId === undefined || d.encounterId === encounterId),
    );
  }

  async approveDeviation(
    tenantId: string,
    deviationId: string,
    approvedBy: string,
  ): Promise<StoredDeviation> {
    const deviation = this.deviations.find(
      (d) => d.tenantId === tenantId && d.deviationId === deviationId,
    );
    if (!deviation) throw new NotFoundException(`Deviation ${deviationId} not found`);

    deviation.approvedBy = approvedBy;
    deviation.approvedAt = new Date().toISOString();

    this.logger.log(`Deviation ${deviationId} approved by ${approvedBy}`);
    return deviation;
  }
}
