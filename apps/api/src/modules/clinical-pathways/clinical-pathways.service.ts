import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CalculateScoreDto,
  CalculatorType,
  CreateOrderSetDto,
  CreatePathwayDto,
  RecordComplianceDto,
  RecordDeviationDto,
} from './dto/clinical-pathways.dto';

// ─── Calculator Results ───────────────────────────────────────────────────────

export interface CalculatorResult {
  calculator: string;
  score: number;
  interpretation: string;
  riskLevel: string;
  recommendation: string;
  details: Record<string, unknown>;
}

const DOC_PREFIX_ORDERSETS = 'ORDER_SET:';
const DOC_PREFIX_PATHWAY = 'CLINICAL_PATHWAY:';
const DOC_PREFIX_COMPLIANCE = 'PROTOCOL_COMPLIANCE:';
const DOC_PREFIX_DEVIATION = 'PROTOCOL_DEVIATION:';
const _DOC_PREFIX_GUIDELINE = 'GUIDELINE_REF:';

@Injectable()
export class ClinicalPathwaysService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Medical Calculators ────────────────────────────────────────────────────

  async calculateScore(tenantId: string, authorId: string, dto: CalculateScoreDto): Promise<CalculatorResult> {
    const params = dto.parameters;
    let result: CalculatorResult;

    switch (dto.calculator) {
      case CalculatorType.CHADS2_VASC:
        result = this.calcCHADS2VASc(params);
        break;
      case CalculatorType.MELD:
        result = this.calcMELD(params);
        break;
      case CalculatorType.CHILD_PUGH:
        result = this.calcChildPugh(params);
        break;
      case CalculatorType.APACHE_II:
        result = this.calcAPACHEII(params);
        break;
      case CalculatorType.WELLS_DVT:
        result = this.calcWellsDVT(params);
        break;
      case CalculatorType.WELLS_PE:
        result = this.calcWellsPE(params);
        break;
      case CalculatorType.GENEVA:
        result = this.calcGeneva(params);
        break;
      case CalculatorType.CURB_65:
        result = this.calcCURB65(params);
        break;
      case CalculatorType.CAPRINI:
        result = this.calcCaprini(params);
        break;
      case CalculatorType.PADUA:
        result = this.calcPadua(params);
        break;
      default:
        result = { calculator: dto.calculator, score: 0, interpretation: 'Calculadora não implementada', riskLevel: 'UNKNOWN', recommendation: '', details: {} };
    }

    // Store the calculation result
    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        type: 'CUSTOM',
        title: `CALCULATOR:${dto.calculator}:Score ${result.score}`,
        content: JSON.stringify({ ...result, parameters: params, calculatedAt: new Date().toISOString() }),
        status: 'FINAL',
      },
    });

    return result;
  }

  private calcCHADS2VASc(p: Record<string, number | boolean | string>): CalculatorResult {
    let score = 0;
    if (p.chf) score += 1;
    if (p.hypertension) score += 1;
    if (p.age75OrOlder) score += 2;
    if (p.diabetes) score += 1;
    if (p.stroke) score += 2;
    if (p.vascularDisease) score += 1;
    if (p.age65to74) score += 1;
    if (p.female) score += 1;

    const riskLevel = score >= 2 ? 'HIGH' : score === 1 ? 'MODERATE' : 'LOW';
    const annualStrokeRisk = [0, 1.3, 2.2, 3.2, 4.0, 6.7, 9.8, 9.6, 6.7, 15.2];
    const risk = annualStrokeRisk[Math.min(score, 9)] ?? 15.2;

    return {
      calculator: 'CHA2DS2-VASc',
      score,
      interpretation: `Risco anual de AVC: ${risk}%`,
      riskLevel,
      recommendation: score >= 2
        ? 'Anticoagulação oral recomendada (DOACs ou varfarina)'
        : score === 1
          ? 'Considerar anticoagulação oral ou antiplaquetário'
          : 'Sem necessidade de anticoagulação',
      details: { annualStrokeRiskPercent: risk },
    };
  }

  private calcMELD(p: Record<string, number | boolean | string>): CalculatorResult {
    const bilirubin = Math.max(Number(p.bilirubin) || 1, 1);
    const creatinine = Math.min(Math.max(Number(p.creatinine) || 1, 1), 4);
    const inr = Math.max(Number(p.inr) || 1, 1);
    const sodium = Math.min(Math.max(Number(p.sodium) || 137, 125), 137);

    const meld = Math.round(
      3.78 * Math.log(bilirubin) +
      11.2 * Math.log(inr) +
      9.57 * Math.log(creatinine) +
      6.43,
    );

    const meldNa = Math.round(meld - sodium - (0.025 * meld * (140 - sodium)) + 140);
    const finalScore = Math.max(6, Math.min(meldNa, 40));

    const riskLevel = finalScore >= 30 ? 'CRITICAL' : finalScore >= 20 ? 'HIGH' : finalScore >= 10 ? 'MODERATE' : 'LOW';

    return {
      calculator: 'MELD-Na',
      score: finalScore,
      interpretation: `MELD-Na Score: ${finalScore} — Mortalidade em 3 meses estimada`,
      riskLevel,
      recommendation: finalScore >= 15 ? 'Considerar avaliação para transplante hepático' : 'Monitoramento contínuo',
      details: { meldBase: meld, meldNa: finalScore, bilirubin, creatinine, inr, sodium },
    };
  }

  private calcChildPugh(p: Record<string, number | boolean | string>): CalculatorResult {
    const bilirubinScore = Number(p.bilirubin) < 2 ? 1 : Number(p.bilirubin) <= 3 ? 2 : 3;
    const albuminScore = Number(p.albumin) > 3.5 ? 1 : Number(p.albumin) >= 2.8 ? 2 : 3;
    const inrScore = Number(p.inr) < 1.7 ? 1 : Number(p.inr) <= 2.3 ? 2 : 3;
    const ascitesScore = p.ascites === 'none' ? 1 : p.ascites === 'mild' ? 2 : 3;
    const encephalopathyScore = p.encephalopathy === 'none' ? 1 : p.encephalopathy === 'grade1_2' ? 2 : 3;

    const score = bilirubinScore + albuminScore + inrScore + ascitesScore + encephalopathyScore;
    const classLetter = score <= 6 ? 'A' : score <= 9 ? 'B' : 'C';
    const survival = classLetter === 'A' ? '100% em 1 ano' : classLetter === 'B' ? '81% em 1 ano' : '45% em 1 ano';

    return {
      calculator: 'Child-Pugh',
      score,
      interpretation: `Child-Pugh Classe ${classLetter} (${score} pontos) — Sobrevida: ${survival}`,
      riskLevel: classLetter === 'A' ? 'LOW' : classLetter === 'B' ? 'MODERATE' : 'HIGH',
      recommendation: classLetter === 'C' ? 'Doença hepática descompensada — considerar transplante' : 'Manejo conforme grau de disfunção',
      details: { class: classLetter, bilirubinScore, albuminScore, inrScore, ascitesScore, encephalopathyScore },
    };
  }

  private calcAPACHEII(p: Record<string, number | boolean | string>): CalculatorResult {
    // Simplified APACHE II — real implementation uses 12 physiologic variables
    const temperature = Number(p.temperature) || 37;
    const mapressure = Number(p.meanArterialPressure) || 80;
    const heartRate = Number(p.heartRate) || 80;
    const respiratoryRate = Number(p.respiratoryRate) || 16;
    const agePoints = Number(p.age) >= 75 ? 6 : Number(p.age) >= 65 ? 5 : Number(p.age) >= 55 ? 3 : Number(p.age) >= 45 ? 2 : 0;
    const gcsPoints = 15 - (Number(p.gcs) || 15);
    const chronicPoints = Number(p.chronicHealthPoints) || 0;

    let physioScore = 0;
    if (temperature >= 41 || temperature <= 29.9) physioScore += 4;
    else if (temperature >= 39 || temperature <= 31.9) physioScore += 3;
    if (mapressure >= 160 || mapressure <= 49) physioScore += 4;
    else if (mapressure >= 130 || mapressure <= 69) physioScore += 2;
    if (heartRate >= 180 || heartRate <= 39) physioScore += 4;
    else if (heartRate >= 140 || heartRate <= 54) physioScore += 3;
    if (respiratoryRate >= 50 || respiratoryRate <= 5) physioScore += 4;
    else if (respiratoryRate >= 35 || respiratoryRate <= 9) physioScore += 3;

    const score = physioScore + agePoints + gcsPoints + chronicPoints;
    const mortalityEstimate = score > 30 ? 73 : score > 20 ? 40 : score > 10 ? 15 : 4;

    return {
      calculator: 'APACHE II',
      score,
      interpretation: `APACHE II: ${score} — Mortalidade estimada: ${mortalityEstimate}%`,
      riskLevel: score > 20 ? 'CRITICAL' : score > 10 ? 'HIGH' : 'MODERATE',
      recommendation: score > 20 ? 'UTI de alta complexidade recomendada' : 'Monitorização em UTI',
      details: { physioScore, agePoints, gcsPoints, chronicPoints, mortalityEstimate },
    };
  }

  private calcWellsDVT(p: Record<string, number | boolean | string>): CalculatorResult {
    let score = 0;
    if (p.activeCancer) score += 1;
    if (p.paralysis) score += 1;
    if (p.recentImmobilization) score += 1;
    if (p.localizedTenderness) score += 1;
    if (p.entireLegSwollen) score += 1;
    if (p.calfSwelling) score += 1;
    if (p.pittingEdema) score += 1;
    if (p.collateralVeins) score += 1;
    if (p.previousDVT) score += 1;
    if (p.alternativeDiagnosis) score -= 2;

    const riskLevel = score >= 3 ? 'HIGH' : score >= 1 ? 'MODERATE' : 'LOW';
    const probability = score >= 3 ? '53%' : score >= 1 ? '17%' : '5%';

    return {
      calculator: 'Wells DVT',
      score,
      interpretation: `Probabilidade de TVP: ${probability}`,
      riskLevel,
      recommendation: score >= 3
        ? 'Ultrassom doppler venoso imediato. Se negativo, repetir em 1 semana.'
        : score >= 1
          ? 'Solicitar D-dímero. Se elevado, ultrassom doppler.'
          : 'D-dímero. Se normal, TVP excluída.',
      details: { probability },
    };
  }

  private calcWellsPE(p: Record<string, number | boolean | string>): CalculatorResult {
    let score = 0;
    if (p.clinicalDVTSigns) score += 3;
    if (p.peMostLikely) score += 3;
    if (p.heartRate100) score += 1.5;
    if (p.immobilizationOrSurgery) score += 1.5;
    if (p.previousDVTPE) score += 1.5;
    if (p.hemoptysis) score += 1;
    if (p.malignancy) score += 1;

    const riskLevel = score > 6 ? 'HIGH' : score >= 2 ? 'MODERATE' : 'LOW';

    return {
      calculator: 'Wells PE',
      score,
      interpretation: `Score Wells TEP: ${score}`,
      riskLevel,
      recommendation: score > 6
        ? 'Alto risco de TEP. AngioTC de tórax imediata.'
        : score >= 2
          ? 'Risco intermediário. D-dímero. Se elevado, angioTC.'
          : 'Baixo risco. D-dímero para exclusão.',
      details: {},
    };
  }

  private calcGeneva(p: Record<string, number | boolean | string>): CalculatorResult {
    let score = 0;
    if (Number(p.age) > 65) score += 1;
    if (p.previousDVTPE) score += 3;
    if (p.surgerOrFracture) score += 2;
    if (p.activeMalignancy) score += 2;
    if (p.unilateralLegPain) score += 3;
    if (p.hemoptysis) score += 2;
    if (Number(p.heartRate) >= 75 && Number(p.heartRate) < 95) score += 3;
    if (Number(p.heartRate) >= 95) score += 5;
    if (p.legPainOnPalpation) score += 4;

    const riskLevel = score >= 11 ? 'HIGH' : score >= 4 ? 'MODERATE' : 'LOW';

    return {
      calculator: 'Geneva Revisado',
      score,
      interpretation: `Score Geneva: ${score}`,
      riskLevel,
      recommendation: score >= 11
        ? 'Alto risco de TEP. AngioTC imediata.'
        : score >= 4
          ? 'Risco intermediário. D-dímero.'
          : 'Baixo risco. D-dímero para exclusão.',
      details: {},
    };
  }

  private calcCURB65(p: Record<string, number | boolean | string>): CalculatorResult {
    let score = 0;
    if (p.confusion) score += 1;
    if (Number(p.bun) > 20 || Number(p.urea) > 7) score += 1;
    if (Number(p.respiratoryRate) >= 30) score += 1;
    if (Number(p.systolicBP) < 90 || Number(p.diastolicBP) <= 60) score += 1;
    if (Number(p.age) >= 65) score += 1;

    const mortality = [0.7, 2.1, 9.2, 14.5, 40, 57];
    const riskLevel = score >= 3 ? 'HIGH' : score >= 2 ? 'MODERATE' : 'LOW';

    return {
      calculator: 'CURB-65',
      score,
      interpretation: `CURB-65: ${score} — Mortalidade: ${mortality[score]}%`,
      riskLevel,
      recommendation: score >= 3
        ? 'Internação em UTI. Antibiótico IV.'
        : score === 2
          ? 'Internação hospitalar. Considerar UTI se piora.'
          : 'Tratamento ambulatorial possível.',
      details: { mortalityPercent: mortality[score] },
    };
  }

  private calcCaprini(p: Record<string, number | boolean | string>): CalculatorResult {
    let score = 0;
    // 1-point factors
    if (Number(p.age) >= 41 && Number(p.age) <= 60) score += 1;
    if (p.minorSurgery) score += 1;
    if (p.bmi25) score += 1;
    if (p.swollenLegs) score += 1;
    if (p.varicoseVeins) score += 1;
    if (p.pregnancy) score += 1;
    if (p.sepsis) score += 1;
    // 2-point factors
    if (Number(p.age) >= 61 && Number(p.age) <= 74) score += 2;
    if (p.majorSurgery) score += 2;
    if (p.malignancy) score += 2;
    if (p.immobilization) score += 2;
    // 3-point factors
    if (Number(p.age) >= 75) score += 3;
    if (p.previousVTE) score += 3;
    if (p.familyVTE) score += 3;
    // 5-point factors
    if (p.strokeLast30Days) score += 5;
    if (p.hipKneeFracture) score += 5;

    const riskLevel = score >= 5 ? 'HIGH' : score >= 3 ? 'MODERATE' : score >= 1 ? 'LOW' : 'VERY_LOW';

    return {
      calculator: 'Caprini',
      score,
      interpretation: `Score Caprini: ${score}`,
      riskLevel,
      recommendation: score >= 5
        ? 'Profilaxia farmacológica + mecânica. Heparina por 7-10 dias.'
        : score >= 3
          ? 'Profilaxia farmacológica. Heparina SC.'
          : score >= 1
            ? 'Deambulação precoce + meias elásticas.'
            : 'Deambulação precoce.',
      details: {},
    };
  }

  private calcPadua(p: Record<string, number | boolean | string>): CalculatorResult {
    let score = 0;
    if (p.activeCancer) score += 3;
    if (p.previousVTE) score += 3;
    if (p.reducedMobility) score += 3;
    if (p.thrombophilia) score += 3;
    if (p.recentTraumaSurgery) score += 2;
    if (Number(p.age) >= 70) score += 1;
    if (p.heartFailure) score += 1;
    if (p.respiratoryFailure) score += 1;
    if (p.amiOrStroke) score += 1;
    if (p.acuteInfection) score += 1;
    if (p.obesity) score += 1;
    if (p.hormoneTherapy) score += 1;

    const riskLevel = score >= 4 ? 'HIGH' : 'LOW';

    return {
      calculator: 'Padua',
      score,
      interpretation: `Score Padua: ${score}`,
      riskLevel,
      recommendation: score >= 4
        ? 'Alto risco VTE. Profilaxia farmacológica recomendada (heparina SC).'
        : 'Baixo risco VTE. Deambulação precoce. Profilaxia mecânica se imobilizado.',
      details: {},
    };
  }

  // ─── Order Sets ─────────────────────────────────────────────────────────────

  async createOrderSet(tenantId: string, authorId: string, dto: CreateOrderSetDto) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const record = {
      id,
      tenantId,
      name: dto.name,
      protocolId: dto.protocolId,
      diagnosisCodes: dto.diagnosisCodes,
      description: dto.description,
      items: dto.items,
      totalItems: dto.items.length,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    const anyPatient = await this.prisma.patient.findFirst({ where: { tenantId }, select: { id: true } });
    if (!anyPatient) throw new NotFoundException('Nenhum paciente cadastrado.');

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: anyPatient.id,
        authorId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX_ORDERSETS}${dto.name}`,
        content: JSON.stringify(record),
        status: 'FINAL',
      },
    });

    return { docId: doc.id, ...record };
  }

  async listOrderSets(tenantId: string, diagnosisCode?: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, type: 'CUSTOM', title: { startsWith: DOC_PREFIX_ORDERSETS } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, content: true, createdAt: true },
    });

    let data = docs.map((d) => ({ docId: d.id, ...JSON.parse(d.content ?? '{}') }));

    if (diagnosisCode) {
      data = data.filter((d: Record<string, unknown>) =>
        Array.isArray(d.diagnosisCodes) && (d.diagnosisCodes as string[]).some((c) => c.startsWith(diagnosisCode)),
      );
    }

    return data;
  }

  // ─── Clinical Pathways Day-by-Day ───────────────────────────────────────────

  async createPathway(tenantId: string, authorId: string, dto: CreatePathwayDto) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const record = {
      id,
      tenantId,
      name: dto.name,
      diagnosisCodes: dto.diagnosisCodes,
      description: dto.description,
      expectedDays: dto.expectedDays,
      days: dto.days,
      active: true,
      createdAt: now,
    };

    const anyPatient = await this.prisma.patient.findFirst({ where: { tenantId }, select: { id: true } });
    if (!anyPatient) throw new NotFoundException('Nenhum paciente cadastrado.');

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: anyPatient.id,
        authorId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX_PATHWAY}${dto.name}`,
        content: JSON.stringify(record),
        status: 'FINAL',
      },
    });

    return { docId: doc.id, ...record };
  }

  async listPathways(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { tenantId, type: 'CUSTOM', title: { startsWith: DOC_PREFIX_PATHWAY } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, content: true, createdAt: true },
    });

    return docs.map((d) => ({ docId: d.id, ...JSON.parse(d.content ?? '{}') }));
  }

  async getPathwayById(tenantId: string, docId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: docId, tenantId, type: 'CUSTOM', title: { startsWith: DOC_PREFIX_PATHWAY } },
    });
    if (!doc) throw new NotFoundException('Protocolo clínico não encontrado.');
    return { docId: doc.id, ...JSON.parse(doc.content ?? '{}') };
  }

  // ─── Protocol Compliance ────────────────────────────────────────────────────

  async recordCompliance(tenantId: string, authorId: string, dto: RecordComplianceDto) {
    const now = new Date().toISOString();
    const totalItems = dto.checklistItems.length;
    const completedItems = dto.checklistItems.filter((i) => i.completed).length;
    const complianceRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const record = {
      id: crypto.randomUUID(),
      tenantId,
      pathwayId: dto.pathwayId,
      encounterId: dto.encounterId,
      checklistItems: dto.checklistItems,
      totalItems,
      completedItems,
      complianceRate,
      recordedAt: now,
      recordedBy: authorId,
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX_COMPLIANCE}${dto.pathwayId}:${complianceRate}%`,
        content: JSON.stringify(record),
        status: 'FINAL',
      },
    });

    return { docId: doc.id, ...record };
  }

  async getComplianceDashboard(tenantId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: DOC_PREFIX_COMPLIANCE },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { content: true },
    });

    const records = docs.map((d) => JSON.parse(d.content ?? '{}'));
    const totalRecords = records.length;
    const avgCompliance = totalRecords > 0
      ? Math.round(records.reduce((s: number, r: Record<string, unknown>) => s + (Number(r.complianceRate) || 0), 0) / totalRecords)
      : 0;

    // Group by pathway
    const byPathway = new Map<string, { count: number; totalCompliance: number }>();
    for (const r of records) {
      const key = (r as Record<string, string>).pathwayId ?? 'unknown';
      const curr = byPathway.get(key) ?? { count: 0, totalCompliance: 0 };
      curr.count++;
      curr.totalCompliance += Number((r as Record<string, unknown>).complianceRate) || 0;
      byPathway.set(key, curr);
    }

    return {
      period: '30d',
      totalRecords,
      avgCompliance,
      byPathway: Array.from(byPathway.entries()).map(([pathwayId, data]) => ({
        pathwayId,
        count: data.count,
        avgCompliance: Math.round(data.totalCompliance / data.count),
      })),
    };
  }

  // ─── Protocol Deviations ────────────────────────────────────────────────────

  async recordDeviation(tenantId: string, authorId: string, dto: RecordDeviationDto) {
    const now = new Date().toISOString();

    const record = {
      id: crypto.randomUUID(),
      tenantId,
      pathwayId: dto.pathwayId,
      encounterId: dto.encounterId,
      deviationDescription: dto.deviationDescription,
      justification: dto.justification,
      severity: dto.severity ?? 'MODERATE',
      recordedAt: now,
      recordedBy: authorId,
      status: 'RECORDED',
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX_DEVIATION}${dto.pathwayId}:${dto.severity ?? 'MODERATE'}`,
        content: JSON.stringify(record),
        status: 'FINAL',
      },
    });

    return { docId: doc.id, ...record };
  }

  async listDeviations(tenantId: string, options: { pathwayId?: string; page?: number; pageSize?: number }) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where: { tenantId, type: 'CUSTOM', title: { startsWith: DOC_PREFIX_DEVIATION } },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, fullName: true } },
          author: { select: { id: true, name: true } },
        },
      }),
      this.prisma.clinicalDocument.count({
        where: { tenantId, type: 'CUSTOM', title: { startsWith: DOC_PREFIX_DEVIATION } },
      }),
    ]);

    let data = docs.map((d) => ({
      docId: d.id,
      ...JSON.parse(d.content ?? '{}'),
      patient: d.patient,
      author: d.author,
    }));

    if (options.pathwayId) {
      data = data.filter((d: Record<string, unknown>) => d.pathwayId === options.pathwayId);
    }

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ─── Integrated Guidelines Library ──────────────────────────────────────────

  async getGuidelinesForDiagnosis(tenantId: string, diagnosisCode: string) {
    // Built-in guidelines mapped to ICD-10 categories
    const guidelinesDb: Record<string, Array<{ title: string; source: string; summary: string; url?: string }>> = {
      I21: [
        { title: 'Diretriz de IAM com Supra de ST', source: 'SBC 2022', summary: 'Cateterismo em até 90min, AAS + clopidogrel, heparina, estatina, betabloqueador', url: 'https://www.scielo.br/sbc-iam' },
        { title: 'AHA/ACC STEMI Guidelines', source: 'AHA 2023', summary: 'PCI primary strategy, dual antiplatelet therapy, evidence-based medications' },
      ],
      A41: [
        { title: 'Bundle de Sepse - ILAS', source: 'ILAS/SSC 2021', summary: 'Lactato, hemoculturas, ATB 1h, cristaloide 30mL/kg, vasopressor se MAP<65' },
      ],
      J18: [
        { title: 'Pneumonia Adquirida na Comunidade', source: 'SBPT 2022', summary: 'CURB-65 para estratificação, ATB empírico conforme gravidade' },
      ],
      N18: [
        { title: 'KDIGO - Doença Renal Crônica', source: 'KDIGO 2024', summary: 'Classificação por TFG e albuminúria, alvos de PA, ISGLT2, estatina' },
      ],
      K74: [
        { title: 'Cirrose Hepática', source: 'EASL/AASLD 2023', summary: 'Child-Pugh/MELD, profilaxia de varizes, paracentese, encefalopatia, transplante' },
      ],
      I48: [
        { title: 'Fibrilação Atrial', source: 'SBC/ESC 2023', summary: 'CHA2DS2-VASc, anticoagulação, controle de frequência vs. ritmo' },
      ],
    };

    const codePrefix = diagnosisCode.slice(0, 3).toUpperCase();
    const guidelines = guidelinesDb[codePrefix] ?? [];

    return {
      diagnosisCode,
      guidelinesFound: guidelines.length,
      guidelines,
    };
  }

  // ─── AI: Protocol Recommendation ────────────────────────────────────────────

  async recommendProtocol(tenantId: string, dto: { diagnosisCodes: string[]; patientAge?: number; gender?: string }) {
    const recommendations: Array<{
      protocolName: string;
      relevance: number;
      diagnosisMatch: string;
      orderSetSuggestion: string;
    }> = [];

    const protocolMap: Record<string, { protocol: string; orderSet: string }> = {
      I21: { protocol: 'Protocolo IAM com Supra de ST', orderSet: 'IAM Admission Order Set' },
      I20: { protocol: 'Protocolo Síndrome Coronariana Aguda', orderSet: 'SCA Order Set' },
      A41: { protocol: 'Bundle de Sepse', orderSet: 'Sepsis Bundle 1h/3h/6h' },
      J18: { protocol: 'Protocolo Pneumonia', orderSet: 'PAC Order Set' },
      I63: { protocol: 'Protocolo AVC Isquêmico', orderSet: 'Stroke Thrombolysis Order Set' },
      K80: { protocol: 'Protocolo Colecistectomia', orderSet: 'Post-op Cholecystectomy' },
      S72: { protocol: 'Protocolo Fratura de Fêmur', orderSet: 'Hip Fracture Admission' },
      E11: { protocol: 'Protocolo Cetoacidose Diabética', orderSet: 'DKA Management' },
      I26: { protocol: 'Protocolo TEP', orderSet: 'PE Treatment Order Set' },
    };

    for (const code of dto.diagnosisCodes) {
      const prefix = code.slice(0, 3).toUpperCase();
      const match = protocolMap[prefix];
      if (match) {
        recommendations.push({
          protocolName: match.protocol,
          relevance: 0.95,
          diagnosisMatch: code,
          orderSetSuggestion: match.orderSet,
        });
      }
    }

    // Always suggest VTE prophylaxis for admitted patients
    recommendations.push({
      protocolName: 'Profilaxia de TEV (Caprini/Padua)',
      relevance: 0.8,
      diagnosisMatch: 'ALL',
      orderSetSuggestion: 'VTE Prophylaxis',
    });

    return {
      diagnosisCodes: dto.diagnosisCodes,
      recommendations: recommendations.sort((a, b) => b.relevance - a.relevance),
      aiConfidence: 0.85,
    };
  }

  // ─── AI: Real-time Compliance Monitoring ────────────────────────────────────

  async monitorComplianceRealTime(tenantId: string) {
    const dashboard = await this.getComplianceDashboard(tenantId);

    const alerts: Array<{ type: string; message: string; severity: string; pathwayId?: string }> = [];

    for (const pathway of dashboard.byPathway) {
      if (pathway.avgCompliance < 70) {
        alerts.push({
          type: 'LOW_COMPLIANCE',
          message: `Protocolo ${pathway.pathwayId}: aderência em ${pathway.avgCompliance}% (abaixo de 70%)`,
          severity: pathway.avgCompliance < 50 ? 'HIGH' : 'MODERATE',
          pathwayId: pathway.pathwayId,
        });
      }
    }

    if (dashboard.avgCompliance < 80) {
      alerts.push({
        type: 'OVERALL_LOW',
        message: `Aderência geral em ${dashboard.avgCompliance}%. Meta: 80%.`,
        severity: 'HIGH',
      });
    }

    return {
      ...dashboard,
      alerts,
      monitoredAt: new Date().toISOString(),
    };
  }
}
