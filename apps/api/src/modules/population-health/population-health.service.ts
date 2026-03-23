import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface ConditionSummaryItem {
  conditionCode: string;
  conditionLabel: string;
  patientCount: number;
}

export interface CareGapItem {
  patientId: string;
  patientName: string;
  mrn: string;
  condition: string;
  gapType: string;
  lastDate: Date | null;
  daysOverdue: number;
  urgency: 'RED' | 'YELLOW' | 'GREEN';
}

export interface RiskStratificationItem {
  patientId: string;
  patientName: string;
  mrn: string;
  age: number;
  conditionCount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  conditions: string[];
  recentAdmission: boolean;
}

export interface RiskSummary {
  low: number;
  medium: number;
  high: number;
  veryHigh: number;
  patients: RiskStratificationItem[];
}

export interface DashboardData {
  conditionCounts: ConditionSummaryItem[];
  gapsSummary: { withGaps: number; withoutGaps: number };
  monthlyDiagnoses: Array<{ month: string; count: number }>;
}

// ─── Condition Mapping ─────────────────────────────────────────────────────

const TRACKED_CONDITIONS: Array<{ code: string; label: string; pattern: RegExp }> = [
  { code: 'DM', label: 'Diabetes Mellitus', pattern: /^E1[0-4]/ },
  { code: 'HAS', label: 'Hipertensão Arterial', pattern: /^I1[0-5]/ },
  { code: 'DPOC', label: 'DPOC', pattern: /^J4[4]/ },
  { code: 'ASMA', label: 'Asma', pattern: /^J45/ },
  { code: 'IRC', label: 'Insuficiência Renal Crônica', pattern: /^N18/ },
  { code: 'ICC', label: 'Insuficiência Cardíaca', pattern: /^I50/ },
  { code: 'NEO', label: 'Neoplasia', pattern: /^C[0-9]/ },
];

// ─── Care Gap Definitions ──────────────────────────────────────────────────

interface CareGapDefinition {
  conditionCode: string;
  gapType: string;
  description: string;
  examPattern: RegExp | null;
  maxDays: number;
  requiresEncounter: boolean;
  ageMin?: number;
  ageMax?: number;
  gender?: 'M' | 'F';
}

const CARE_GAP_DEFINITIONS: CareGapDefinition[] = [
  {
    conditionCode: 'DM',
    gapType: 'HbA1c',
    description: 'DM sem HbA1c nos últimos 6 meses',
    examPattern: /hba1c|hemoglobina\s*glicada/i,
    maxDays: 180,
    requiresEncounter: false,
  },
  {
    conditionCode: 'HAS',
    gapType: 'Consulta',
    description: 'HAS sem consulta nos últimos 3 meses',
    examPattern: null,
    maxDays: 90,
    requiresEncounter: true,
  },
  {
    conditionCode: 'DM',
    gapType: 'Fundo de Olho',
    description: 'Diabéticos sem fundo de olho no último ano',
    examPattern: /fundo\s*de\s*olho|fundoscopia|retinografia/i,
    maxDays: 365,
    requiresEncounter: false,
  },
  {
    conditionCode: 'HAS',
    gapType: 'ECG',
    description: 'Hipertensos sem ECG no último ano',
    examPattern: /ecg|eletrocardiograma/i,
    maxDays: 365,
    requiresEncounter: false,
  },
  {
    conditionCode: '_SCREENING_PAP',
    gapType: 'Papanicolau',
    description: 'Mulheres 25-64 sem Papanicolau nos últimos 3 anos',
    examPattern: /papanicolau|colpocitologia|pap\s*test/i,
    maxDays: 1095,
    requiresEncounter: false,
    ageMin: 25,
    ageMax: 64,
    gender: 'F',
  },
  {
    conditionCode: '_SCREENING_COLONO',
    gapType: 'Colonoscopia',
    description: 'Adultos 50+ sem colonoscopia nos últimos 10 anos',
    examPattern: /colonoscopia/i,
    maxDays: 3650,
    requiresEncounter: false,
    ageMin: 50,
  },
];

// ─── Service ───────────────────────────────────────────────────────────────

@Injectable()
export class PopulationHealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getConditionsSummary(
    tenantId: string,
    filters?: { ageMin?: number; ageMax?: number; gender?: string; diagnosedFrom?: string; diagnosedTo?: string },
  ): Promise<ConditionSummaryItem[]> {
    const conditions = await this.prisma.chronicCondition.findMany({
      where: {
        status: 'ACTIVE',
        patient: {
          tenantId,
          ...(filters?.gender ? { gender: filters.gender as 'M' | 'F' } : {}),
        },
        ...(filters?.diagnosedFrom || filters?.diagnosedTo
          ? {
              diagnosedAt: {
                ...(filters?.diagnosedFrom ? { gte: new Date(filters.diagnosedFrom) } : {}),
                ...(filters?.diagnosedTo ? { lte: new Date(filters.diagnosedTo) } : {}),
              },
            }
          : {}),
      },
      include: {
        patient: { select: { id: true, birthDate: true } },
      },
    });

    const now = new Date();
    const result: ConditionSummaryItem[] = [];

    for (const tracked of TRACKED_CONDITIONS) {
      const matchingPatientIds = new Set<string>();

      for (const cond of conditions) {
        if (!cond.cidCode || !tracked.pattern.test(cond.cidCode)) continue;

        const age = this.calculateAge(cond.patient.birthDate, now);
        if (filters?.ageMin !== undefined && age < filters.ageMin) continue;
        if (filters?.ageMax !== undefined && age > filters.ageMax) continue;

        matchingPatientIds.add(cond.patientId);
      }

      result.push({
        conditionCode: tracked.code,
        conditionLabel: tracked.label,
        patientCount: matchingPatientIds.size,
      });
    }

    return result;
  }

  async getPatientsByCondition(
    tenantId: string,
    conditionCode: string,
    filters?: { ageMin?: number; ageMax?: number; gender?: string; page?: number; pageSize?: number },
  ) {
    const tracked = TRACKED_CONDITIONS.find((c) => c.code === conditionCode);
    if (!tracked) {
      return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    }

    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;

    const conditions = await this.prisma.chronicCondition.findMany({
      where: {
        status: 'ACTIVE',
        patient: {
          tenantId,
          ...(filters?.gender ? { gender: filters.gender as 'M' | 'F' } : {}),
        },
      },
      include: {
        patient: {
          select: { id: true, fullName: true, mrn: true, birthDate: true, gender: true },
        },
      },
    });

    const now = new Date();
    const patientMap = new Map<string, typeof conditions[0]['patient'] & { cidCode: string; diagnosedAt: Date | null }>();

    for (const cond of conditions) {
      if (!cond.cidCode || !tracked.pattern.test(cond.cidCode)) continue;

      const age = this.calculateAge(cond.patient.birthDate, now);
      if (filters?.ageMin !== undefined && age < filters.ageMin) continue;
      if (filters?.ageMax !== undefined && age > filters.ageMax) continue;

      if (!patientMap.has(cond.patientId)) {
        patientMap.set(cond.patientId, {
          ...cond.patient,
          cidCode: cond.cidCode,
          diagnosedAt: cond.diagnosedAt,
        });
      }
    }

    const allPatients = Array.from(patientMap.values());
    const total = allPatients.length;
    const skip = (page - 1) * pageSize;
    const data = allPatients.slice(skip, skip + pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getCareGaps(
    tenantId: string,
    filters?: { conditionCode?: string; page?: number; pageSize?: number },
  ) {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50;
    const now = new Date();

    // Get all patients with active chronic conditions in this tenant
    const patients = await this.prisma.patient.findMany({
      where: { tenantId },
      select: {
        id: true,
        fullName: true,
        mrn: true,
        birthDate: true,
        gender: true,
        chronicConditions: {
          where: { status: 'ACTIVE' },
          select: { cidCode: true, cidDescription: true },
        },
        examResults: {
          orderBy: { createdAt: 'desc' },
          select: { examName: true, createdAt: true },
        },
        encounters: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: { startedAt: true },
        },
      },
    });

    const gaps: CareGapItem[] = [];

    for (const patient of patients) {
      const age = this.calculateAge(patient.birthDate, now);
      const patientConditionCodes = new Set<string>();

      for (const cond of patient.chronicConditions) {
        for (const tracked of TRACKED_CONDITIONS) {
          if (cond.cidCode && tracked.pattern.test(cond.cidCode)) {
            patientConditionCodes.add(tracked.code);
          }
        }
      }

      for (const gapDef of CARE_GAP_DEFINITIONS) {
        if (filters?.conditionCode && gapDef.conditionCode !== filters.conditionCode) continue;

        // Check screening gaps (not condition-specific)
        const isScreening = gapDef.conditionCode.startsWith('_SCREENING');

        if (!isScreening && !patientConditionCodes.has(gapDef.conditionCode)) continue;

        // Check demographic filters
        if (gapDef.gender && patient.gender !== gapDef.gender) continue;
        if (gapDef.ageMin !== undefined && age < gapDef.ageMin) continue;
        if (gapDef.ageMax !== undefined && age > gapDef.ageMax) continue;

        let lastDate: Date | null = null;

        if (gapDef.requiresEncounter) {
          lastDate = patient.encounters[0]?.startedAt ?? null;
        } else if (gapDef.examPattern) {
          const matchingExam = patient.examResults.find((e) =>
            gapDef.examPattern!.test(e.examName),
          );
          lastDate = matchingExam?.createdAt ?? null;
        }

        const daysSince = lastDate
          ? Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
          : 9999;

        if (daysSince > gapDef.maxDays) {
          const daysOverdue = daysSince - gapDef.maxDays;
          const urgencyRatio = daysSince / gapDef.maxDays;

          let urgency: 'RED' | 'YELLOW' | 'GREEN';
          if (urgencyRatio >= 2) {
            urgency = 'RED';
          } else if (urgencyRatio >= 1) {
            urgency = 'YELLOW';
          } else {
            urgency = 'GREEN';
          }

          gaps.push({
            patientId: patient.id,
            patientName: patient.fullName,
            mrn: patient.mrn,
            condition: gapDef.conditionCode.replace(/^_SCREENING_/, ''),
            gapType: gapDef.gapType,
            lastDate,
            daysOverdue,
            urgency,
          });
        }
      }
    }

    // Sort by urgency (RED first)
    const urgencyOrder = { RED: 0, YELLOW: 1, GREEN: 2 };
    gaps.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    const total = gaps.length;
    const skip = (page - 1) * pageSize;
    const data = gaps.slice(skip, skip + pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getRiskStratification(tenantId: string): Promise<RiskSummary> {
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const patients = await this.prisma.patient.findMany({
      where: { tenantId },
      select: {
        id: true,
        fullName: true,
        mrn: true,
        birthDate: true,
        chronicConditions: {
          where: { status: 'ACTIVE' },
          select: { cidCode: true, cidDescription: true },
        },
        encounters: {
          where: {
            type: 'HOSPITALIZATION',
            startedAt: { gte: sixMonthsAgo },
          },
          select: { id: true },
        },
      },
    });

    const result: RiskStratificationItem[] = [];

    for (const patient of patients) {
      const age = this.calculateAge(patient.birthDate, now);
      const conditionCount = patient.chronicConditions.length;
      const recentAdmission = patient.encounters.length > 0;
      const conditions = patient.chronicConditions
        .map((c) => c.cidDescription ?? c.cidCode ?? 'Desconhecida')
        .filter(Boolean);

      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

      if (recentAdmission && conditionCount >= 2) {
        riskLevel = 'VERY_HIGH';
      } else if (conditionCount >= 3) {
        riskLevel = 'HIGH';
      } else if (conditionCount >= 2 || age > 60) {
        riskLevel = 'MEDIUM';
      } else {
        riskLevel = 'LOW';
      }

      // Only include patients with conditions or risk factors
      if (conditionCount > 0 || age > 60) {
        result.push({
          patientId: patient.id,
          patientName: patient.fullName,
          mrn: patient.mrn,
          age,
          conditionCount,
          riskLevel,
          conditions,
          recentAdmission,
        });
      }
    }

    return {
      low: result.filter((p) => p.riskLevel === 'LOW').length,
      medium: result.filter((p) => p.riskLevel === 'MEDIUM').length,
      high: result.filter((p) => p.riskLevel === 'HIGH').length,
      veryHigh: result.filter((p) => p.riskLevel === 'VERY_HIGH').length,
      patients: result,
    };
  }

  async getDashboard(tenantId: string): Promise<DashboardData> {
    const [conditionCounts, careGaps, monthlyDiagnoses] = await Promise.all([
      this.getConditionsSummary(tenantId),
      this.getCareGaps(tenantId, { pageSize: 9999 }),
      this.getMonthlyDiagnoses(tenantId),
    ]);

    const uniquePatientsWithGaps = new Set(careGaps.data.map((g) => g.patientId)).size;
    const totalPatients = await this.prisma.patient.count({ where: { tenantId } });

    return {
      conditionCounts,
      gapsSummary: {
        withGaps: uniquePatientsWithGaps,
        withoutGaps: Math.max(0, totalPatients - uniquePatientsWithGaps),
      },
      monthlyDiagnoses,
    };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private calculateAge(birthDate: Date, referenceDate: Date): number {
    let age = referenceDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private async getMonthlyDiagnoses(tenantId: string): Promise<Array<{ month: string; count: number }>> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const conditions = await this.prisma.chronicCondition.findMany({
      where: {
        patient: { tenantId },
        diagnosedAt: { gte: twelveMonthsAgo },
      },
      select: { diagnosedAt: true },
    });

    const monthCounts = new Map<string, number>();
    const now = new Date();

    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthCounts.set(key, 0);
    }

    for (const cond of conditions) {
      if (!cond.diagnosedAt) continue;
      const key = `${cond.diagnosedAt.getFullYear()}-${String(cond.diagnosedAt.getMonth() + 1).padStart(2, '0')}`;
      if (monthCounts.has(key)) {
        monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
      }
    }

    return Array.from(monthCounts.entries()).map(([month, count]) => ({ month, count }));
  }
}
