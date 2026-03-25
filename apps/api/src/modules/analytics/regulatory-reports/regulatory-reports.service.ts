import {
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SubmitSinanDto, SubmitNotivisaDto } from './regulatory-reports.dto';

interface SinanNotification {
  id: string;
  patientId: string;
  tenantId: string;
  diseaseCode: string;
  diseaseName: string;
  notificationDate: string;
  symptomsOnsetDate?: string;
  formData?: Record<string, unknown>;
  encounterId?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'DISCARDED';
  submittedAt?: string;
}

interface NotivisaReport {
  id: string;
  patientId: string;
  tenantId: string;
  eventType: string;
  productName: string;
  description: string;
  severity?: string;
  eventDate?: string;
  formData?: Record<string, unknown>;
  status: 'DRAFT' | 'SUBMITTED' | 'INVESTIGATING' | 'CLOSED';
  submittedAt?: string;
}

@Injectable()
export class RegulatoryReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async submitSinan(tenantId: string, userEmail: string, dto: SubmitSinanDto) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    });

    const notification: SinanNotification = {
      id: crypto.randomUUID(),
      patientId: dto.patientId,
      tenantId,
      diseaseCode: dto.diseaseCode,
      diseaseName: dto.diseaseName,
      notificationDate: dto.notificationDate,
      symptomsOnsetDate: dto.symptomsOnsetDate,
      formData: dto.formData,
      encounterId: dto.encounterId,
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId: user!.id,
        encounterId: dto.encounterId,
        type: 'CUSTOM',
        title: `SINAN: ${dto.diseaseName} (${dto.diseaseCode})`,
        content: JSON.stringify(notification),
        status: 'SIGNED',
      },
    });

    return { notificationId: doc.id, status: 'SUBMITTED', diseaseCode: dto.diseaseCode };
  }

  async listSinan(tenantId: string, options: { page?: number; pageSize?: number; status?: string }) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = {
      tenantId,
      type: 'CUSTOM' as const,
      title: { startsWith: 'SINAN:' },
    };

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, title: true, content: true, createdAt: true,
          patient: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    const data = docs.map((d) => {
      const n = JSON.parse(d.content ?? '{}') as SinanNotification;
      return {
        notificationId: d.id,
        diseaseCode: n.diseaseCode,
        diseaseName: n.diseaseName,
        patientName: d.patient?.fullName,
        notificationDate: n.notificationDate,
        status: n.status,
      };
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getAnsIndicators(tenantId: string, options: { startDate?: string; endDate?: string }) {
    const dateFilter: Record<string, Date> | undefined = (() => {
      if (!options.startDate && !options.endDate) return undefined;
      const f: Record<string, Date> = {};
      if (options.startDate) f.gte = new Date(options.startDate);
      if (options.endDate) f.lte = new Date(options.endDate);
      return f;
    })();

    const encounterWhere: Record<string, unknown> = { tenantId };
    if (dateFilter) encounterWhere.createdAt = dateFilter;

    const [totalEncounters, completedEncounters, cancelledEncounters, totalAdmissions, avgWaitEncounters] = await Promise.all([
      this.prisma.encounter.count({ where: encounterWhere }),
      this.prisma.encounter.count({ where: { ...encounterWhere, status: 'COMPLETED' } }),
      this.prisma.encounter.count({ where: { ...encounterWhere, status: 'CANCELLED' } }),
      this.prisma.admission.count({ where: { tenantId, ...(dateFilter ? { admissionDate: dateFilter } : {}) } }),
      this.prisma.encounter.findMany({
        where: { ...encounterWhere, status: 'COMPLETED', startedAt: { not: null }, scheduledAt: { not: null } },
        select: { scheduledAt: true, startedAt: true },
        take: 500,
      }),
    ]);

    // Average wait time
    const waitTimes = avgWaitEncounters
      .filter((e) => e.startedAt && e.scheduledAt)
      .map((e) => (e.startedAt!.getTime() - e.scheduledAt!.getTime()) / (60 * 1000));

    const avgWaitMinutes = waitTimes.length > 0
      ? Math.round(waitTimes.reduce((s, v) => s + v, 0) / waitTimes.length)
      : 0;

    // ANS required indicators (RN 501)
    return {
      indicators: [
        {
          code: 'IDSS-01',
          name: 'Taxa de Ocupação',
          value: totalAdmissions,
          unit: 'internações',
        },
        {
          code: 'IDSS-02',
          name: 'Taxa de Atendimentos Concluídos',
          value: totalEncounters > 0 ? Math.round((completedEncounters / totalEncounters) * 10000) / 100 : 0,
          unit: '%',
          benchmark: 95,
        },
        {
          code: 'IDSS-03',
          name: 'Taxa de Cancelamento',
          value: totalEncounters > 0 ? Math.round((cancelledEncounters / totalEncounters) * 10000) / 100 : 0,
          unit: '%',
          benchmark: 5,
        },
        {
          code: 'IDSS-04',
          name: 'Tempo Médio de Espera',
          value: avgWaitMinutes,
          unit: 'minutos',
          benchmark: 30,
        },
        {
          code: 'IDSS-05',
          name: 'Total de Atendimentos',
          value: totalEncounters,
          unit: 'atendimentos',
        },
      ],
      period: {
        startDate: options.startDate ?? 'all',
        endDate: options.endDate ?? 'all',
      },
    };
  }

  async submitNotivisa(tenantId: string, userEmail: string, dto: SubmitNotivisaDto) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    });

    const report: NotivisaReport = {
      id: crypto.randomUUID(),
      patientId: dto.patientId,
      tenantId,
      eventType: dto.eventType,
      productName: dto.productName,
      description: dto.description,
      severity: dto.severity,
      eventDate: dto.eventDate,
      formData: dto.formData,
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId: user!.id,
        type: 'CUSTOM',
        title: `NOTIVISA: ${dto.eventType} — ${dto.productName}`,
        content: JSON.stringify(report),
        status: 'SIGNED',
      },
    });

    return { reportId: doc.id, status: 'SUBMITTED', eventType: dto.eventType };
  }

  async getRegulatoryDashboard(tenantId: string) {
    const [sinanCount, notivisaCount] = await Promise.all([
      this.prisma.clinicalDocument.count({
        where: { tenantId, type: 'CUSTOM', title: { startsWith: 'SINAN:' } },
      }),
      this.prisma.clinicalDocument.count({
        where: { tenantId, type: 'CUSTOM', title: { startsWith: 'NOTIVISA:' } },
      }),
    ]);

    // Recent notifications
    const recentNotifications = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: 'SINAN:' },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, createdAt: true },
    });

    return {
      sinanNotifications: sinanCount,
      notivisaReports: notivisaCount,
      totalRegulatorySubmissions: sinanCount + notivisaCount,
      recentNotifications: recentNotifications.map((n) => ({
        id: n.id,
        title: n.title,
        date: n.createdAt,
      })),
      complianceStatus: {
        sinan: sinanCount > 0 ? 'ACTIVE' : 'NO_SUBMISSIONS',
        notivisa: notivisaCount > 0 ? 'ACTIVE' : 'NO_SUBMISSIONS',
      },
    };
  }
}
