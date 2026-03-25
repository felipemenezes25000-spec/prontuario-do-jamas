import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class QualityMeasuresService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDateFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return undefined;
    const filter: Record<string, Date> = {};
    if (startDate) filter.gte = new Date(startDate);
    if (endDate) filter.lte = new Date(endDate);
    return filter;
  }

  async getInfectionRate(tenantId: string, options: { startDate?: string; endDate?: string }) {
    const dateFilter = this.buildDateFilter(options.startDate, options.endDate);
    const where: Record<string, unknown> = { tenantId };
    if (dateFilter) where.createdAt = dateFilter;

    const totalAdmissions = await this.prisma.admission.count({ where: { tenantId, ...(dateFilter ? { admissionDate: dateFilter } : {}) } });

    // Count infections — encounters with infection-related CID codes (A00-B99)
    const encountersWithNotes = await this.prisma.clinicalNote.findMany({
      where: {
        encounter: { tenantId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
        diagnosisCodes: { hasSome: ['A', 'B'].flatMap((l) =>
          Array.from({ length: 100 }, (_, i) => `${l}${String(i).padStart(2, '0')}`)
        ) },
      },
      select: { encounterId: true },
    });

    const infectionEncounters = new Set(encountersWithNotes.map((n) => n.encounterId)).size;

    const rate = totalAdmissions > 0 ? Math.round((infectionEncounters / totalAdmissions) * 10000) / 100 : 0;

    return {
      totalAdmissions,
      infectionCases: infectionEncounters,
      infectionRate: rate,
      benchmark: 3.5, // National benchmark %
      status: rate <= 3.5 ? 'WITHIN_TARGET' : 'ABOVE_TARGET',
    };
  }

  async getMortalityIndicators(tenantId: string, options: { startDate?: string; endDate?: string }) {
    const dateFilter = this.buildDateFilter(options.startDate, options.endDate);

    const totalAdmissions = await this.prisma.admission.count({
      where: { tenantId, ...(dateFilter ? { admissionDate: dateFilter } : {}) },
    });

    const deaths = await this.prisma.admission.count({
      where: { tenantId, dischargeType: 'DEATH', ...(dateFilter ? { actualDischargeDate: dateFilter } : {}) },
    });

    const mortalityRate = totalAdmissions > 0 ? Math.round((deaths / totalAdmissions) * 10000) / 100 : 0;

    // ICU specific mortality
    const icuAdmissions = await this.prisma.admission.count({
      where: {
        tenantId,
        currentBed: { isNot: null },
        ...(dateFilter ? { admissionDate: dateFilter } : {}),
      },
    });

    return {
      totalAdmissions,
      deaths,
      overallMortalityRate: mortalityRate,
      icuAdmissions,
      benchmark: 2.5,
      status: mortalityRate <= 2.5 ? 'WITHIN_TARGET' : 'ABOVE_TARGET',
    };
  }

  async getReadmissionRate(tenantId: string, options: { startDate?: string; endDate?: string; days?: number }) {
    const days = options.days ?? 30;
    const dateFilter = this.buildDateFilter(options.startDate, options.endDate);

    const admissions = await this.prisma.admission.findMany({
      where: {
        tenantId,
        actualDischargeDate: { not: null },
        ...(dateFilter ? { actualDischargeDate: dateFilter } : {}),
      },
      select: { patientId: true, actualDischargeDate: true, admissionDate: true },
      orderBy: { admissionDate: 'asc' },
    });

    let readmissions = 0;
    const patientAdmissions = new Map<string, Date[]>();

    for (const adm of admissions) {
      const existing = patientAdmissions.get(adm.patientId) ?? [];
      existing.push(adm.admissionDate);
      patientAdmissions.set(adm.patientId, existing);
    }

    for (const [, dates] of patientAdmissions) {
      for (let i = 1; i < dates.length; i++) {
        const gap = (dates[i].getTime() - dates[i - 1].getTime()) / (24 * 60 * 60 * 1000);
        if (gap <= days) readmissions++;
      }
    }

    const rate = admissions.length > 0 ? Math.round((readmissions / admissions.length) * 10000) / 100 : 0;

    return {
      totalDischarges: admissions.length,
      readmissions,
      readmissionRate: rate,
      windowDays: days,
      benchmark: 10.0,
      status: rate <= 10.0 ? 'WITHIN_TARGET' : 'ABOVE_TARGET',
    };
  }

  async getLengthOfStay(tenantId: string, options: { startDate?: string; endDate?: string }) {
    const dateFilter = this.buildDateFilter(options.startDate, options.endDate);

    const admissions = await this.prisma.admission.findMany({
      where: {
        tenantId,
        actualDischargeDate: { not: null },
        ...(dateFilter ? { actualDischargeDate: dateFilter } : {}),
      },
      select: {
        admissionDate: true,
        actualDischargeDate: true,
        admissionType: true,
        encounter: { select: { type: true } },
      },
    });

    const losValues = admissions.map((a) => ({
      los: Math.ceil((a.actualDischargeDate!.getTime() - a.admissionDate.getTime()) / (24 * 60 * 60 * 1000)),
      type: a.admissionType,
      encounterType: a.encounter?.type,
    }));

    const totalLos = losValues.reduce((s, v) => s + v.los, 0);
    const avgLos = losValues.length > 0 ? Math.round((totalLos / losValues.length) * 10) / 10 : 0;

    // By admission type
    const byType = new Map<string, number[]>();
    for (const v of losValues) {
      const existing = byType.get(v.type) ?? [];
      existing.push(v.los);
      byType.set(v.type, existing);
    }

    return {
      totalAdmissions: losValues.length,
      averageLos: avgLos,
      medianLos: losValues.length > 0
        ? losValues.map((v) => v.los).sort((a, b) => a - b)[Math.floor(losValues.length / 2)]
        : 0,
      benchmark: 5.0,
      status: avgLos <= 5.0 ? 'WITHIN_TARGET' : 'ABOVE_TARGET',
      byAdmissionType: Array.from(byType.entries()).map(([type, values]) => ({
        type,
        count: values.length,
        averageLos: Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10,
      })),
    };
  }

  async getProtocolCompliance(tenantId: string, options: { startDate?: string; endDate?: string }) {
    const dateFilter = this.buildDateFilter(options.startDate, options.endDate);

    // Count encounters with clinical notes (protocol adherence proxy)
    const totalEncounters = await this.prisma.encounter.count({
      where: { tenantId, status: 'COMPLETED', ...(dateFilter ? { createdAt: dateFilter } : {}) },
    });

    const encountersWithNotes = await this.prisma.encounter.count({
      where: {
        tenantId,
        status: 'COMPLETED',
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        clinicalNotes: { some: { status: { in: ['FINAL', 'SIGNED', 'COSIGNED'] } } },
      },
    });

    const encountersWithVitals = await this.prisma.encounter.count({
      where: {
        tenantId,
        status: 'COMPLETED',
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        vitalSigns: { some: {} },
      },
    });

    const noteCompliance = totalEncounters > 0 ? Math.round((encountersWithNotes / totalEncounters) * 10000) / 100 : 0;
    const vitalsCompliance = totalEncounters > 0 ? Math.round((encountersWithVitals / totalEncounters) * 10000) / 100 : 0;

    return {
      totalCompletedEncounters: totalEncounters,
      clinicalNoteCompliance: noteCompliance,
      vitalSignsCompliance: vitalsCompliance,
      overallCompliance: Math.round(((noteCompliance + vitalsCompliance) / 2) * 100) / 100,
      benchmark: 90.0,
      status: noteCompliance >= 90 && vitalsCompliance >= 90 ? 'WITHIN_TARGET' : 'BELOW_TARGET',
    };
  }

  async getQualityDashboard(tenantId: string, options: { startDate?: string; endDate?: string }) {
    const [infection, mortality, readmission, los, compliance] = await Promise.all([
      this.getInfectionRate(tenantId, options),
      this.getMortalityIndicators(tenantId, options),
      this.getReadmissionRate(tenantId, options),
      this.getLengthOfStay(tenantId, options),
      this.getProtocolCompliance(tenantId, options),
    ]);

    const indicators = [
      { name: 'Taxa de Infecção', value: infection.infectionRate, benchmark: infection.benchmark, unit: '%', status: infection.status },
      { name: 'Mortalidade Geral', value: mortality.overallMortalityRate, benchmark: mortality.benchmark, unit: '%', status: mortality.status },
      { name: 'Readmissão 30 dias', value: readmission.readmissionRate, benchmark: readmission.benchmark, unit: '%', status: readmission.status },
      { name: 'Tempo Médio Internação', value: los.averageLos, benchmark: los.benchmark, unit: 'dias', status: los.status },
      { name: 'Aderência Protocolar', value: compliance.overallCompliance, benchmark: compliance.benchmark, unit: '%', status: compliance.status },
    ];

    const withinTarget = indicators.filter((i) => i.status === 'WITHIN_TARGET').length;

    return {
      overallScore: Math.round((withinTarget / indicators.length) * 100),
      indicators,
      summary: {
        infection,
        mortality,
        readmission,
        los,
        compliance,
      },
    };
  }
}
