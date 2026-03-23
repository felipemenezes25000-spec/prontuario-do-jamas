import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface StatusAggregate {
  count: number;
  amount: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getHospitalMovement(tenantId: string, startDate: Date, endDate: Date) {
    const [admissions, discharges, encounters] = await Promise.all([
      this.prisma.admission.count({
        where: { tenantId, admissionDate: { gte: startDate, lte: endDate } },
      }),
      this.prisma.admission.count({
        where: {
          tenantId,
          actualDischargeDate: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.encounter.count({
        where: { tenantId, createdAt: { gte: startDate, lte: endDate } },
      }),
    ]);

    const dailyAdmissions = await this.prisma.admission.groupBy({
      by: ['admissionDate'],
      where: { tenantId, admissionDate: { gte: startDate, lte: endDate } },
      _count: true,
    });

    const dailyEncounters = await this.prisma.encounter.groupBy({
      by: ['createdAt'],
      where: { tenantId, createdAt: { gte: startDate, lte: endDate } },
      _count: true,
    });

    // Build a day-by-day map
    const dayMap = new Map<string, { admissions: number; discharges: number; encounters: number }>();

    for (const row of dailyAdmissions) {
      const day = row.admissionDate.toISOString().slice(0, 10);
      const entry = dayMap.get(day) ?? { admissions: 0, discharges: 0, encounters: 0 };
      entry.admissions += row._count;
      dayMap.set(day, entry);
    }

    for (const row of dailyEncounters) {
      const day = row.createdAt.toISOString().slice(0, 10);
      const entry = dayMap.get(day) ?? { admissions: 0, discharges: 0, encounters: 0 };
      entry.encounters += row._count;
      dayMap.set(day, entry);
    }

    const daily = Array.from(dayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      summary: {
        totalAdmissions: admissions,
        totalDischarges: discharges,
        totalEncounters: encounters,
      },
      daily,
    };
  }

  async getDailyCensus(tenantId: string, date: Date) {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const activeAdmissions = await this.prisma.admission.findMany({
      where: {
        tenantId,
        admissionDate: { lte: endOfDay },
        OR: [
          { actualDischargeDate: null },
          { actualDischargeDate: { gt: endOfDay } },
        ],
      },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        currentBed: {
          select: { ward: true, room: true, bedNumber: true },
        },
      },
    });

    return {
      totalOccupied: activeAdmissions.length,
      patients: activeAdmissions.map((a) => ({
        patientId: a.patient.id,
        patientName: a.patient.fullName,
        mrn: a.patient.mrn,
        bed: a.currentBed
          ? `${a.currentBed.ward} - ${a.currentBed.room}/${a.currentBed.bedNumber}`
          : 'Sem leito',
        admissionDate: a.admissionDate,
        daysAdmitted: Math.ceil(
          (endOfDay.getTime() - a.admissionDate.getTime()) / 86_400_000,
        ),
      })),
    };
  }

  async getDoctorProductivity(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const encounters = await this.prisma.encounter.groupBy({
      by: ['primaryDoctorId'],
      where: { tenantId, createdAt: { gte: startDate, lte: endDate } },
      _count: true,
    });

    const doctorIds = encounters
      .map((e) => e.primaryDoctorId)
      .filter((id): id is string => id !== null);

    const doctors = await this.prisma.user.findMany({
      where: { id: { in: doctorIds } },
      select: { id: true, name: true },
    });

    const doctorMap = new Map(doctors.map((d) => [d.id, d.name]));

    return encounters
      .map((e) => ({
        doctorId: e.primaryDoctorId,
        doctorName: doctorMap.get(e.primaryDoctorId ?? '') ?? 'Desconhecido',
        encounterCount: e._count,
      }))
      .sort((a, b) => b.encounterCount - a.encounterCount);
  }

  async getQualityIndicators(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const [totalEncounters, totalTriages, totalAlerts] = await Promise.all([
      this.prisma.encounter.count({
        where: { tenantId, createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.triageAssessment.count({
        where: {
          encounter: { tenantId },
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      this.prisma.clinicalAlert.count({
        where: { tenantId, createdAt: { gte: startDate, lte: endDate } },
      }),
    ]);

    const triageRate =
      totalEncounters > 0
        ? Math.round((totalTriages / totalEncounters) * 100)
        : 0;

    return {
      totalEncounters,
      totalTriages,
      triageRate,
      totalAlerts,
    };
  }

  async getFinancialReport(tenantId: string, startDate: Date, endDate: Date) {
    const entries = await this.prisma.billingEntry.findMany({
      where: { tenantId, createdAt: { gte: startDate, lte: endDate } },
      select: {
        status: true,
        totalAmount: true,
        glosedAmount: true,
        approvedAmount: true,
        insuranceProvider: true,
      },
    });

    let totalBilled = 0;
    let totalGlosed = 0;
    let totalApproved = 0;
    const byStatus: Record<string, StatusAggregate> = {};
    const byInsurer: Record<string, StatusAggregate> = {};

    for (const e of entries) {
      const amount = Number(e.totalAmount) || 0;
      totalBilled += amount;
      totalGlosed += Number(e.glosedAmount) || 0;
      totalApproved += Number(e.approvedAmount) || 0;

      const status = e.status ?? 'UNKNOWN';
      if (!byStatus[status]) byStatus[status] = { count: 0, amount: 0 };
      byStatus[status].count++;
      byStatus[status].amount += amount;

      const insurer = e.insuranceProvider ?? 'Particular';
      if (!byInsurer[insurer]) byInsurer[insurer] = { count: 0, amount: 0 };
      byInsurer[insurer].count++;
      byInsurer[insurer].amount += amount;
    }

    return {
      totalBilled,
      totalGlosed,
      totalApproved,
      totalEntries: entries.length,
      byStatus,
      byInsurer,
    };
  }

  async getEncounterStats(tenantId: string, startDate: Date, endDate: Date) {
    const encounters = await this.prisma.encounter.findMany({
      where: { tenantId, createdAt: { gte: startDate, lte: endDate } },
      select: { type: true, status: true, createdAt: true },
    });

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byDay: Record<string, number> = {};

    for (const e of encounters) {
      const type = e.type ?? 'OTHER';
      byType[type] = (byType[type] || 0) + 1;

      const status = e.status ?? 'UNKNOWN';
      byStatus[status] = (byStatus[status] || 0) + 1;

      const day = e.createdAt.toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    }

    return { total: encounters.length, byType, byStatus, byDay };
  }

  // ── BLOCO B5: New Analytics Endpoints ──────────────────────

  async getOccupancyRate(tenantId: string, startDate: Date, endDate: Date) {
    // Get all admissions that overlap with the date range, join bed for ward info
    const admissions = await this.prisma.admission.findMany({
      where: {
        tenantId,
        admissionDate: { lte: endDate },
        OR: [
          { actualDischargeDate: null },
          { actualDischargeDate: { gte: startDate } },
        ],
      },
      select: {
        currentBed: { select: { ward: true } },
      },
    });

    // Count total beds per ward
    const beds = await this.prisma.bed.groupBy({
      by: ['ward'],
      where: { tenantId },
      _count: true,
    });

    const bedsByWard = new Map(beds.map((b) => [b.ward, b._count]));

    // Calculate occupancy per ward
    const wardMap = new Map<string, number>();
    for (const a of admissions) {
      const ward = a.currentBed?.ward ?? 'Sem setor';
      wardMap.set(ward, (wardMap.get(ward) ?? 0) + 1);
    }

    const sectors = Array.from(new Set([...wardMap.keys(), ...bedsByWard.keys()])).map(
      (ward) => {
        const occupied = wardMap.get(ward) ?? 0;
        const totalBeds = bedsByWard.get(ward) ?? Math.max(occupied, 1);
        return {
          ward,
          occupied,
          totalBeds,
          rate: totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0,
        };
      },
    );

    const totalOccupied = sectors.reduce((s, w) => s + w.occupied, 0);
    const totalBeds = sectors.reduce((s, w) => s + w.totalBeds, 0);
    const overallRate = totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;

    return { overallRate, totalOccupied, totalBeds, sectors };
  }

  async getLengthOfStay(tenantId: string, startDate: Date, endDate: Date) {
    const admissions = await this.prisma.admission.findMany({
      where: {
        tenantId,
        actualDischargeDate: { gte: startDate, lte: endDate },
      },
      select: {
        admissionDate: true,
        actualDischargeDate: true,
        diagnosisAtAdmission: true,
      },
    });

    const byCid = new Map<string, { totalDays: number; count: number }>();

    for (const a of admissions) {
      if (!a.actualDischargeDate) continue;
      const days = Math.ceil(
        (a.actualDischargeDate.getTime() - a.admissionDate.getTime()) / 86_400_000,
      );
      const cid = a.diagnosisAtAdmission ?? 'Sem CID';
      const entry = byCid.get(cid) ?? { totalDays: 0, count: 0 };
      entry.totalDays += days;
      entry.count++;
      byCid.set(cid, entry);
    }

    const results = Array.from(byCid.entries())
      .map(([cid, { totalDays, count }]) => ({
        cid,
        avgDays: count > 0 ? Math.round((totalDays / count) * 10) / 10 : 0,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return results;
  }

  async getTopDiagnoses(tenantId: string, startDate: Date, endDate: Date) {
    // Use ClinicalNote.diagnosisCodes (string[]) joined via encounter
    const notes = await this.prisma.clinicalNote.findMany({
      where: {
        encounter: { tenantId },
        createdAt: { gte: startDate, lte: endDate },
        diagnosisCodes: { isEmpty: false },
      },
      select: { diagnosisCodes: true },
    });

    const cidCount = new Map<string, number>();
    for (const note of notes) {
      for (const cid of note.diagnosisCodes) {
        cidCount.set(cid, (cidCount.get(cid) ?? 0) + 1);
      }
    }

    // Also check admission diagnoses
    const admissions = await this.prisma.admission.findMany({
      where: {
        tenantId,
        admissionDate: { gte: startDate, lte: endDate },
        diagnosisAtAdmission: { not: null },
      },
      select: { diagnosisAtAdmission: true },
    });

    for (const a of admissions) {
      if (a.diagnosisAtAdmission) {
        const cid = a.diagnosisAtAdmission;
        cidCount.set(cid, (cidCount.get(cid) ?? 0) + 1);
      }
    }

    return Array.from(cidCount.entries())
      .map(([cid, count]) => ({ cid, description: cid, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  async getProductionByDoctor(tenantId: string, startDate: Date, endDate: Date) {
    const encounters = await this.prisma.encounter.groupBy({
      by: ['primaryDoctorId'],
      where: { tenantId, createdAt: { gte: startDate, lte: endDate } },
      _count: true,
    });

    const doctorIds = encounters
      .map((e) => e.primaryDoctorId)
      .filter((id): id is string => id !== null);

    const doctors = await this.prisma.user.findMany({
      where: { id: { in: doctorIds } },
      select: { id: true, name: true },
    });

    const doctorMap = new Map(doctors.map((d) => [d.id, d.name]));

    return encounters
      .map((e) => ({
        doctorId: e.primaryDoctorId,
        doctorName: doctorMap.get(e.primaryDoctorId ?? '') ?? 'Desconhecido',
        encounterCount: e._count,
      }))
      .sort((a, b) => b.encounterCount - a.encounterCount);
  }

  async getCustomQuery(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    dimension: string,
    metric: string,
    groupBy: string,
  ) {
    const encounters = await this.prisma.encounter.findMany({
      where: { tenantId, createdAt: { gte: startDate, lte: endDate } },
      select: {
        type: true,
        status: true,
        createdAt: true,
        primaryDoctorId: true,
        location: true,
      },
    });

    // Determine group key
    const getGroupKey = (date: Date, gb: string): string => {
      const iso = date.toISOString();
      switch (gb) {
        case 'day':
          return iso.slice(0, 10);
        case 'week': {
          const d = new Date(date);
          d.setDate(d.getDate() - d.getDay());
          return d.toISOString().slice(0, 10);
        }
        case 'month':
          return iso.slice(0, 7);
        case 'year':
          return iso.slice(0, 4);
        default:
          return iso.slice(0, 7);
      }
    };

    // Determine dimension value
    const getDimension = (e: (typeof encounters)[0]): string => {
      switch (dimension) {
        case 'type':
          return e.type ?? 'OTHER';
        case 'doctor':
          return e.primaryDoctorId ?? 'Desconhecido';
        case 'cid':
          return e.location ?? 'Sem setor';
        case 'status':
          return e.status ?? 'UNKNOWN';
        default:
          return 'Total';
      }
    };

    const grouped = new Map<string, Map<string, number>>();

    for (const e of encounters) {
      const gKey = getGroupKey(e.createdAt, groupBy);
      const dKey = getDimension(e);
      if (!grouped.has(gKey)) grouped.set(gKey, new Map());
      const dimMap = grouped.get(gKey)!;
      dimMap.set(dKey, (dimMap.get(dKey) ?? 0) + 1);
    }

    const rows = Array.from(grouped.entries())
      .map(([period, dimensions]) => ({
        period,
        dimensions: Object.fromEntries(dimensions),
        total: Array.from(dimensions.values()).reduce((s, v) => s + v, 0),
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return {
      dimension,
      metric,
      groupBy,
      rows,
      totalRecords: encounters.length,
    };
  }
}
