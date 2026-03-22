import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface DashboardStats {
  totalPatients: number;
  totalPatientsChange: number;
  encountersToday: number;
  encountersTodayChange: number;
  occupiedBeds: number;
  totalBeds: number;
  occupancyRate: number;
  activeAlerts: number;
  criticalAlerts: number;
  scheduledAppointments: number;
  completedAppointments: number;
  pendingPrescriptions: number;
  waitingTriage: number;
  averageWaitTime: number;
  revenueThisMonth: number;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStats(tenantId: string): Promise<DashboardStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalPatients,
      patientsLastMonth,
      patientsThisMonth,
      encountersToday,
      encountersYesterday,
      bedCounts,
      activeAlerts,
      criticalAlerts,
      scheduledAppointments,
      completedAppointments,
      pendingPrescriptions,
      waitingTriageCount,
      waitingEncounters,
      revenueResult,
    ] = await Promise.all([
      // Total patients
      this.prisma.patient.count({
        where: { tenantId, isActive: true, deletedAt: null },
      }),

      // Patients created last month
      this.prisma.patient.count({
        where: {
          tenantId,
          isActive: true,
          deletedAt: null,
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),

      // Patients created this month
      this.prisma.patient.count({
        where: {
          tenantId,
          isActive: true,
          deletedAt: null,
          createdAt: { gte: thisMonthStart },
        },
      }),

      // Encounters today (started)
      this.prisma.encounter.count({
        where: {
          tenantId,
          startedAt: { gte: todayStart, lt: todayEnd },
        },
      }),

      // Encounters yesterday (for change calculation)
      this.prisma.encounter.count({
        where: {
          tenantId,
          startedAt: { gte: yesterdayStart, lt: todayStart },
        },
      }),

      // Bed counts by status
      this.prisma.bed.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),

      // Active alerts
      this.prisma.clinicalAlert.count({
        where: { tenantId, isActive: true },
      }),

      // Critical alerts
      this.prisma.clinicalAlert.count({
        where: { tenantId, isActive: true, severity: 'CRITICAL' },
      }),

      // Scheduled appointments for today
      this.prisma.appointment.count({
        where: {
          tenantId,
          scheduledAt: { gte: todayStart, lt: todayEnd },
          status: { in: ['SCHEDULED', 'CONFIRMED', 'WAITING'] },
        },
      }),

      // Completed appointments today
      this.prisma.appointment.count({
        where: {
          tenantId,
          scheduledAt: { gte: todayStart, lt: todayEnd },
          status: 'COMPLETED',
        },
      }),

      // Pending prescriptions (DRAFT or ACTIVE not dispensed)
      this.prisma.prescription.count({
        where: {
          tenantId,
          status: { in: ['DRAFT', 'ACTIVE'] },
          dispensedAt: null,
        },
      }),

      // Encounters waiting triage
      this.prisma.encounter.count({
        where: {
          tenantId,
          status: 'IN_TRIAGE',
        },
      }),

      // Waiting encounters (for average wait time calc)
      this.prisma.encounter.findMany({
        where: {
          tenantId,
          status: 'WAITING',
          createdAt: { gte: todayStart },
        },
        select: { createdAt: true },
      }),

      // Revenue this month (sum of approved billing amounts)
      this.prisma.billingEntry.aggregate({
        where: {
          tenantId,
          createdAt: { gte: thisMonthStart },
          status: { in: ['APPROVED', 'PARTIALLY_APPROVED'] },
        },
        _sum: { approvedAmount: true },
      }),
    ]);

    // Calculate bed occupancy
    const totalBeds = bedCounts.reduce((sum, g) => sum + g._count.id, 0);
    const occupiedBeds =
      bedCounts.find((g) => g.status === 'OCCUPIED')?._count.id ?? 0;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // Calculate patient change %
    const totalPatientsChange =
      patientsLastMonth > 0
        ? Math.round(((patientsThisMonth - patientsLastMonth) / patientsLastMonth) * 100)
        : patientsThisMonth > 0
          ? 100
          : 0;

    // Calculate encounters today change %
    const encountersTodayChange =
      encountersYesterday > 0
        ? Math.round(((encountersToday - encountersYesterday) / encountersYesterday) * 100)
        : encountersToday > 0
          ? 100
          : 0;

    // Calculate average wait time in minutes
    const averageWaitTime =
      waitingEncounters.length > 0
        ? Math.round(
            waitingEncounters.reduce(
              (sum, e) => sum + (now.getTime() - e.createdAt.getTime()) / 60000,
              0,
            ) / waitingEncounters.length,
          )
        : 0;

    // Revenue
    const revenueThisMonth = revenueResult._sum.approvedAmount
      ? Number(revenueResult._sum.approvedAmount)
      : 0;

    return {
      totalPatients,
      totalPatientsChange,
      encountersToday,
      encountersTodayChange,
      occupiedBeds,
      totalBeds,
      occupancyRate,
      activeAlerts,
      criticalAlerts,
      scheduledAppointments,
      completedAppointments,
      pendingPrescriptions,
      waitingTriage: waitingTriageCount,
      averageWaitTime,
      revenueThisMonth,
    };
  }
}
