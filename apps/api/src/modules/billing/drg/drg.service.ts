import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface DrgResult {
  drgCode: string;
  drgDescription: string;
  mdc: string;
  mdcDescription: string;
  weight: number;
  averageLos: number;
  expectedCost: number;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
}

@Injectable()
export class DrgService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateDrg(
    tenantId: string,
    dto: {
      principalDiagnosis: string;
      secondaryDiagnoses?: string[];
      procedureCodes?: string[];
      age?: number;
      gender?: string;
      dischargeStatus?: string;
      ventilationHours?: number;
    },
  ) {
    // Brazilian DRG calculation (simplified)
    // In production, this uses a full MDC/DRG grouper library
    const diagCode = dto.principalDiagnosis.toUpperCase();

    // Map first character to MDC (Major Diagnostic Category)
    const mdcMap: Record<string, { mdc: string; description: string }> = {
      A: { mdc: '18', description: 'Doenças Infecciosas e Parasitárias' },
      B: { mdc: '18', description: 'Doenças Infecciosas e Parasitárias' },
      C: { mdc: '17', description: 'Neoplasias' },
      D: { mdc: '17', description: 'Neoplasias' },
      E: { mdc: '10', description: 'Doenças Endócrinas' },
      F: { mdc: '19', description: 'Transtornos Mentais' },
      G: { mdc: '01', description: 'Doenças do Sistema Nervoso' },
      H: { mdc: '02', description: 'Doenças do Olho / Ouvido' },
      I: { mdc: '05', description: 'Doenças do Aparelho Circulatório' },
      J: { mdc: '04', description: 'Doenças do Aparelho Respiratório' },
      K: { mdc: '06', description: 'Doenças do Aparelho Digestivo' },
      L: { mdc: '09', description: 'Doenças da Pele e Subcutâneo' },
      M: { mdc: '08', description: 'Doenças do Sistema Osteomuscular' },
      N: { mdc: '11', description: 'Doenças do Aparelho Geniturinário' },
      O: { mdc: '14', description: 'Gravidez, Parto e Puerpério' },
      P: { mdc: '15', description: 'Condições do Período Neonatal' },
      Q: { mdc: '15', description: 'Malformações Congênitas' },
      R: { mdc: '23', description: 'Sinais e Sintomas' },
      S: { mdc: '21', description: 'Traumatismos' },
      T: { mdc: '21', description: 'Traumatismos' },
      Z: { mdc: '23', description: 'Fatores que Influenciam o Estado de Saúde' },
    };

    const firstChar = diagCode.charAt(0);
    const mdcInfo = mdcMap[firstChar] ?? { mdc: '23', description: 'Outros' };

    // Severity based on number of secondary diagnoses and comorbidities
    const comorbidityCount = dto.secondaryDiagnoses?.length ?? 0;
    let severity: DrgResult['severity'] = 'LOW';
    if (comorbidityCount >= 4) severity = 'EXTREME';
    else if (comorbidityCount >= 2) severity = 'HIGH';
    else if (comorbidityCount >= 1) severity = 'MODERATE';

    const severityWeight: Record<string, number> = {
      LOW: 0.8,
      MODERATE: 1.0,
      HIGH: 1.5,
      EXTREME: 2.5,
    };

    const baseWeight = 1.0;
    const weight = baseWeight * severityWeight[severity];
    const baseCost = 3500; // Base cost in BRL

    const result: DrgResult = {
      drgCode: `${mdcInfo.mdc}-${severity.charAt(0)}${Math.floor(Math.random() * 99).toString().padStart(2, '0')}`,
      drgDescription: `${mdcInfo.description} — ${severity}`,
      mdc: mdcInfo.mdc,
      mdcDescription: mdcInfo.description,
      weight: Math.round(weight * 100) / 100,
      averageLos: severity === 'EXTREME' ? 14 : severity === 'HIGH' ? 8 : severity === 'MODERATE' ? 5 : 3,
      expectedCost: Math.round(baseCost * weight * 100) / 100,
      severity,
    };

    return result;
  }

  async getDrgForEncounter(tenantId: string, encounterId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, tenantId },
      include: {
        clinicalNotes: { select: { diagnosisCodes: true, procedureCodes: true } },
        patient: { select: { birthDate: true, gender: true } },
        admission: { select: { admissionDate: true, actualDischargeDate: true, dischargeType: true } },
      },
    });

    if (!encounter) throw new NotFoundException('Atendimento não encontrado.');

    const allDiagnoses = encounter.clinicalNotes.flatMap((n) => n.diagnosisCodes);
    const principalDiagnosis = allDiagnoses[0] ?? 'R69';
    const secondaryDiagnoses = allDiagnoses.slice(1);
    const procedureCodes = encounter.clinicalNotes.flatMap((n) => n.procedureCodes);

    const age = encounter.patient?.birthDate
      ? Math.floor((Date.now() - encounter.patient.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : undefined;

    const drg = await this.calculateDrg(tenantId, {
      principalDiagnosis,
      secondaryDiagnoses,
      procedureCodes,
      age,
      gender: encounter.patient?.gender,
    });

    // Calculate actual LOS
    const actualLos = encounter.admission?.actualDischargeDate && encounter.admission?.admissionDate
      ? Math.ceil((encounter.admission.actualDischargeDate.getTime() - encounter.admission.admissionDate.getTime()) / (24 * 60 * 60 * 1000))
      : null;

    return {
      encounterId,
      ...drg,
      actualLos,
      losVariance: actualLos !== null ? actualLos - drg.averageLos : null,
      diagnoses: { principal: principalDiagnosis, secondary: secondaryDiagnoses },
      procedureCodes,
    };
  }

  async getDrgAnalytics(tenantId: string, options: { startDate?: string; endDate?: string }) {
    const where: Record<string, unknown> = { tenantId };
    if (options.startDate || options.endDate) {
      const createdAt: Record<string, Date> = {};
      if (options.startDate) createdAt.gte = new Date(options.startDate);
      if (options.endDate) createdAt.lte = new Date(options.endDate);
      where.createdAt = createdAt;
    }

    const encounters = await this.prisma.encounter.findMany({
      where: { ...where, status: 'COMPLETED' },
      include: {
        clinicalNotes: { select: { diagnosisCodes: true } },
        billingEntries: { select: { totalAmount: true } },
        admission: { select: { admissionDate: true, actualDischargeDate: true } },
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    const drgMix = new Map<string, { count: number; totalCost: number; avgLos: number; losSum: number }>();

    for (const enc of encounters) {
      const diagnoses = enc.clinicalNotes.flatMap((n) => n.diagnosisCodes);
      const principal = diagnoses[0] ?? 'R69';
      const firstChar = principal.charAt(0);

      const los = enc.admission?.actualDischargeDate && enc.admission?.admissionDate
        ? Math.ceil((enc.admission.actualDischargeDate.getTime() - enc.admission.admissionDate.getTime()) / (24 * 60 * 60 * 1000))
        : 0;

      const cost = enc.billingEntries.reduce((s, be) => s + (be.totalAmount ? Number(be.totalAmount) : 0), 0);

      const existing = drgMix.get(firstChar) ?? { count: 0, totalCost: 0, avgLos: 0, losSum: 0 };
      existing.count++;
      existing.totalCost += cost;
      existing.losSum += los;
      drgMix.set(firstChar, existing);
    }

    const analytics = Array.from(drgMix.entries()).map(([key, val]) => ({
      mdcCategory: key,
      encounterCount: val.count,
      totalCost: Math.round(val.totalCost * 100) / 100,
      averageLos: val.count > 0 ? Math.round((val.losSum / val.count) * 10) / 10 : 0,
      averageCost: val.count > 0 ? Math.round((val.totalCost / val.count) * 100) / 100 : 0,
    })).sort((a, b) => b.encounterCount - a.encounterCount);

    return {
      totalEncounters: encounters.length,
      drgMix: analytics,
    };
  }

  // ─── Complexity Mix Optimization ────────────────────────────────────────────

  async getComplexityMix(tenantId: string, options: { startDate?: string; endDate?: string }) {
    const analytics = await this.getDrgAnalytics(tenantId, options);

    const totalWeight = analytics.drgMix.reduce((s, d) => s + d.averageCost * d.encounterCount, 0);
    const totalEncounters = analytics.totalEncounters;
    const caseMixIndex = totalEncounters > 0 ? Math.round((totalWeight / totalEncounters / 3500) * 100) / 100 : 0;

    const byComplexity = {
      low: analytics.drgMix.filter((d) => d.averageCost < 3000),
      moderate: analytics.drgMix.filter((d) => d.averageCost >= 3000 && d.averageCost < 7000),
      high: analytics.drgMix.filter((d) => d.averageCost >= 7000 && d.averageCost < 15000),
      extreme: analytics.drgMix.filter((d) => d.averageCost >= 15000),
    };

    const recommendations: string[] = [];
    const lowPct = byComplexity.low.reduce((s, d) => s + d.encounterCount, 0) / Math.max(totalEncounters, 1);
    if (lowPct > 0.6) {
      recommendations.push('Alta proporção de casos de baixa complexidade. Considere ambulatorização para reduzir custos.');
    }
    if (caseMixIndex < 0.8) {
      recommendations.push('Case Mix Index abaixo da média. Verifique se diagnósticos secundários estão sendo documentados corretamente.');
    }
    if (caseMixIndex > 1.5) {
      recommendations.push('Case Mix Index elevado. Revisar protocolos de alta precoce e eficiência operacional.');
    }

    return {
      caseMixIndex,
      totalEncounters,
      byComplexity: {
        low: { count: byComplexity.low.reduce((s, d) => s + d.encounterCount, 0), percentage: Math.round(lowPct * 100) },
        moderate: { count: byComplexity.moderate.reduce((s, d) => s + d.encounterCount, 0) },
        high: { count: byComplexity.high.reduce((s, d) => s + d.encounterCount, 0) },
        extreme: { count: byComplexity.extreme.reduce((s, d) => s + d.encounterCount, 0) },
      },
      recommendations,
    };
  }

  // ─── Revenue Prediction per Case ────────────────────────────────────────────

  async predictRevenue(
    tenantId: string,
    dto: {
      principalDiagnosis: string;
      secondaryDiagnoses?: string[];
      procedureCodes?: string[];
      estimatedLos?: number;
    },
  ) {
    const drg = await this.calculateDrg(tenantId, {
      principalDiagnosis: dto.principalDiagnosis,
      secondaryDiagnoses: dto.secondaryDiagnoses,
      procedureCodes: dto.procedureCodes,
    });

    const dailyRate = 850; // Average BRL daily hospital rate
    const estimatedLos = dto.estimatedLos ?? drg.averageLos;
    const baseRevenue = drg.expectedCost;

    const revenueBreakdown = {
      dailyRates: Math.round(dailyRate * estimatedLos * 100) / 100,
      professionalFees: Math.round(baseRevenue * 0.25 * 100) / 100,
      materials: Math.round(baseRevenue * 0.15 * 100) / 100,
      drugs: Math.round(baseRevenue * 0.2 * 100) / 100,
      exams: Math.round(baseRevenue * 0.1 * 100) / 100,
      procedures: Math.round(baseRevenue * 0.3 * 100) / 100,
    };

    const totalEstimatedRevenue = Object.values(revenueBreakdown).reduce((s, v) => s + v, 0);
    const estimatedCost = Math.round(totalEstimatedRevenue * 0.65 * 100) / 100; // 65% cost ratio
    const estimatedMargin = Math.round((totalEstimatedRevenue - estimatedCost) * 100) / 100;

    return {
      drg,
      estimatedLos,
      totalEstimatedRevenue: Math.round(totalEstimatedRevenue * 100) / 100,
      estimatedCost,
      estimatedMargin,
      marginPercentage: totalEstimatedRevenue > 0
        ? Math.round((estimatedMargin / totalEstimatedRevenue) * 10000) / 100
        : 0,
      revenueBreakdown,
    };
  }

  // ─── Cost per Patient/Case Analysis ─────────────────────────────────────────

  async getCostAnalysis(tenantId: string, encounterId: string) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, tenantId },
      include: {
        patient: { select: { id: true, fullName: true } },
        billingEntries: true,
        clinicalNotes: { select: { diagnosisCodes: true, procedureCodes: true } },
        prescriptions: {
          include: { items: { select: { medicationName: true, dose: true } } },
        },
        admission: { select: { admissionDate: true, actualDischargeDate: true } },
      },
    });

    if (!encounter) throw new NotFoundException('Atendimento não encontrado.');

    const totalBilled = encounter.billingEntries.reduce(
      (s, e) => s + (e.totalAmount ? Number(e.totalAmount) : 0), 0,
    );
    const totalApproved = encounter.billingEntries.reduce(
      (s, e) => s + (e.approvedAmount ? Number(e.approvedAmount) : 0), 0,
    );
    const totalGlosa = encounter.billingEntries.reduce(
      (s, e) => s + (e.glosedAmount ? Number(e.glosedAmount) : 0), 0,
    );

    const los = encounter.admission?.actualDischargeDate && encounter.admission?.admissionDate
      ? Math.ceil((encounter.admission.actualDischargeDate.getTime() - encounter.admission.admissionDate.getTime()) / (24 * 60 * 60 * 1000))
      : null;

    // Estimated cost breakdown
    const estimatedCosts = {
      materials: Math.round(totalBilled * 0.15 * 100) / 100,
      drugs: Math.round(totalBilled * 0.2 * 100) / 100,
      staffing: Math.round(totalBilled * 0.35 * 100) / 100,
      hospitality: Math.round(totalBilled * 0.1 * 100) / 100,
      exams: Math.round(totalBilled * 0.12 * 100) / 100,
      overhead: Math.round(totalBilled * 0.08 * 100) / 100,
    };

    const totalEstimatedCost = Object.values(estimatedCosts).reduce((s, v) => s + v, 0);

    return {
      encounterId,
      patient: encounter.patient,
      lengthOfStay: los,
      financials: {
        totalBilled: Math.round(totalBilled * 100) / 100,
        totalApproved: Math.round(totalApproved * 100) / 100,
        totalGlosa: Math.round(totalGlosa * 100) / 100,
        glosaRate: totalBilled > 0 ? Math.round((totalGlosa / totalBilled) * 10000) / 100 : 0,
      },
      estimatedCosts,
      totalEstimatedCost: Math.round(totalEstimatedCost * 100) / 100,
      margin: Math.round((totalApproved - totalEstimatedCost) * 100) / 100,
      marginPercentage: totalApproved > 0
        ? Math.round(((totalApproved - totalEstimatedCost) / totalApproved) * 10000) / 100
        : 0,
      diagnoses: encounter.clinicalNotes.flatMap((n) => n.diagnosisCodes),
      prescriptionCount: encounter.prescriptions.length,
    };
  }
}
