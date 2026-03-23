import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface PositiveCulture {
  id: string;
  patientId: string;
  patientName: string;
  mrn: string;
  bed: string | null;
  ward: string | null;
  examName: string;
  microorganism: string;
  sensitivity: string;
  collectedAt: Date | null;
  completedAt: Date | null;
}

export type IsolationTypeValue = 'CONTACT' | 'DROPLET' | 'AIRBORNE' | 'PROTECTIVE' | 'COMBINED';

export interface IsolationPatient {
  admissionId: string;
  patientId: string;
  patientName: string;
  mrn: string;
  bed: string | null;
  ward: string | null;
  isolationType: IsolationTypeValue;
  isolationReason: string | null;
  isolationStartDate: Date;
  admissionDate: Date;
}

export interface StartIsolationDto {
  admissionId: string;
  isolationType: IsolationTypeValue;
  reason: string;
}

export interface InfectionDashboardData {
  infectionsBySector: Array<{ sector: string; count: number }>;
  topMicroorganisms: Array<{ name: string; count: number }>;
  resistanceProfile: Array<{
    microorganism: string;
    antibiotic: string;
    result: 'SENSITIVE' | 'RESISTANT' | 'INTERMEDIATE';
  }>;
  monthlyInfections: Array<{ month: string; count: number }>;
}

export interface CompulsoryNotificationDto {
  patientId: string;
  cidCode: string;
  disease: string;
  notificationDate: string;
  symptomsDate: string;
  confirmationCriteria: string;
  observations?: string;
}

export interface CompulsoryNotification {
  id: string;
  patientId: string;
  patientName: string;
  disease: string;
  cidCode: string;
  notificationDate: Date;
  symptomsDate: Date;
  confirmationCriteria: string;
  observations: string | null;
  sinanData: Record<string, unknown>;
  createdAt: Date;
}

// ─── Notifiable Disease List ───────────────────────────────────────────────

const NOTIFIABLE_DISEASES = [
  { name: 'Dengue', cidCode: 'A90' },
  { name: 'COVID-19', cidCode: 'U07.1' },
  { name: 'Tuberculose', cidCode: 'A15' },
  { name: 'Meningite', cidCode: 'G03' },
  { name: 'Sarampo', cidCode: 'B05' },
  { name: 'HIV/AIDS', cidCode: 'B20' },
  { name: 'Hepatite B', cidCode: 'B16' },
  { name: 'Hepatite C', cidCode: 'B17.1' },
  { name: 'Sífilis', cidCode: 'A51' },
  { name: 'Influenza', cidCode: 'J09' },
  { name: 'Leptospirose', cidCode: 'A27' },
];

// ─── Service ───────────────────────────────────────────────────────────────

@Injectable()
export class InfectionControlService {
  constructor(private readonly prisma: PrismaService) {}

  getNotifiableDiseases() {
    return NOTIFIABLE_DISEASES;
  }

  async getPositiveCultures(
    tenantId: string,
    filters?: { page?: number; pageSize?: number; days?: number },
  ) {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50;
    const skip = (page - 1) * pageSize;
    const daysBack = filters?.days ?? 30;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysBack);

    const exams = await this.prisma.examResult.findMany({
      where: {
        patient: { tenantId },
        examType: 'LABORATORY',
        completedAt: { gte: sinceDate },
        labResults: { not: Prisma.JsonNull },
      },
      orderBy: { completedAt: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            mrn: true,
            encounters: {
              where: { type: 'HOSPITALIZATION', status: 'IN_PROGRESS' },
              take: 1,
              select: { bed: true, location: true },
            },
          },
        },
      },
    });

    // Filter to only positive cultures based on labResults content
    const positiveCultures: PositiveCulture[] = [];

    for (const exam of exams) {
      const labData = exam.labResults as Record<string, unknown> | null;
      if (!labData) continue;

      // Check if result indicates positive culture
      const resultText = String(labData['result'] ?? labData['resultado'] ?? '').toLowerCase();
      const isPositive =
        resultText.includes('positiv') ||
        resultText.includes('crescimento') ||
        resultText.includes('isolado') ||
        resultText.includes('detectado');

      if (!isPositive) continue;

      const encounter = exam.patient.encounters[0];

      positiveCultures.push({
        id: exam.id,
        patientId: exam.patientId,
        patientName: exam.patient.fullName,
        mrn: exam.patient.mrn,
        bed: encounter?.bed ?? null,
        ward: encounter?.location ?? null,
        examName: exam.examName,
        microorganism: String(labData['microorganism'] ?? labData['microorganismo'] ?? 'Não identificado'),
        sensitivity: String(labData['sensitivity'] ?? labData['sensibilidade'] ?? 'Pendente'),
        collectedAt: exam.collectedAt,
        completedAt: exam.completedAt,
      });
    }

    const total = positiveCultures.length;
    const data = positiveCultures.slice(skip, skip + pageSize);

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getIsolationPatients(tenantId: string) {
    const admissions = await this.prisma.admission.findMany({
      where: {
        tenantId,
        isolationRequired: true,
        actualDischargeDate: null,
      },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        encounter: { select: { bed: true, location: true } },
      },
      orderBy: { admissionDate: 'desc' },
    });

    const patients: IsolationPatient[] = admissions.map((adm) => ({
      admissionId: adm.id,
      patientId: adm.patientId,
      patientName: adm.patient.fullName,
      mrn: adm.patient.mrn,
      bed: adm.encounter?.bed ?? null,
      ward: adm.encounter?.location ?? null,
      isolationType: (adm.isolationType ?? 'CONTACT') as IsolationTypeValue,
      isolationReason: adm.diagnosisAtAdmission,
      isolationStartDate: adm.admissionDate,
      admissionDate: adm.admissionDate,
    }));

    return patients;
  }

  async startIsolation(tenantId: string, dto: StartIsolationDto) {
    const admission = await this.prisma.admission.findFirst({
      where: { id: dto.admissionId, tenantId },
    });

    if (!admission) {
      throw new NotFoundException(`Internação com ID "${dto.admissionId}" não encontrada.`);
    }

    if (admission.isolationRequired) {
      throw new BadRequestException('Paciente já está em isolamento.');
    }

    return this.prisma.admission.update({
      where: { id: dto.admissionId },
      data: {
        isolationRequired: true,
        isolationType: dto.isolationType,
        diagnosisAtAdmission: admission.diagnosisAtAdmission
          ? `${admission.diagnosisAtAdmission} | Isolamento: ${dto.reason}`
          : `Isolamento: ${dto.reason}`,
      },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
      },
    });
  }

  async endIsolation(tenantId: string, admissionId: string) {
    const admission = await this.prisma.admission.findFirst({
      where: { id: admissionId, tenantId },
    });

    if (!admission) {
      throw new NotFoundException(`Internação com ID "${admissionId}" não encontrada.`);
    }

    if (!admission.isolationRequired) {
      throw new BadRequestException('Paciente não está em isolamento.');
    }

    return this.prisma.admission.update({
      where: { id: admissionId },
      data: {
        isolationRequired: false,
        isolationType: null,
      },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
      },
    });
  }

  async getDashboard(tenantId: string): Promise<InfectionDashboardData> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Get positive cultures from last 12 months
    const exams = await this.prisma.examResult.findMany({
      where: {
        patient: { tenantId },
        examType: 'LABORATORY',
        completedAt: { gte: twelveMonthsAgo },
        labResults: { not: Prisma.JsonNull },
      },
      include: {
        patient: {
          select: {
            encounters: {
              where: { type: 'HOSPITALIZATION' },
              take: 1,
              select: { location: true },
            },
          },
        },
      },
    });

    const sectorCounts = new Map<string, number>();
    const microCounts = new Map<string, number>();
    const resistanceData: InfectionDashboardData['resistanceProfile'] = [];
    const monthCounts = new Map<string, number>();

    // Initialize last 12 months
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthCounts.set(key, 0);
    }

    for (const exam of exams) {
      const labData = exam.labResults as Record<string, unknown> | null;
      if (!labData) continue;

      const resultText = String(labData['result'] ?? labData['resultado'] ?? '').toLowerCase();
      const isPositive =
        resultText.includes('positiv') ||
        resultText.includes('crescimento') ||
        resultText.includes('isolado') ||
        resultText.includes('detectado');

      if (!isPositive) continue;

      // Sector
      const sector = exam.patient.encounters[0]?.location ?? 'Ambulatório';
      sectorCounts.set(sector, (sectorCounts.get(sector) ?? 0) + 1);

      // Microorganism
      const micro = String(labData['microorganism'] ?? labData['microorganismo'] ?? 'Outros');
      microCounts.set(micro, (microCounts.get(micro) ?? 0) + 1);

      // Monthly
      if (exam.completedAt) {
        const monthKey = `${exam.completedAt.getFullYear()}-${String(exam.completedAt.getMonth() + 1).padStart(2, '0')}`;
        if (monthCounts.has(monthKey)) {
          monthCounts.set(monthKey, (monthCounts.get(monthKey) ?? 0) + 1);
        }
      }

      // Resistance profile
      const sensData = labData['sensitivity'] ?? labData['sensibilidade'] ?? labData['antibiogram'];
      if (sensData && typeof sensData === 'object' && !Array.isArray(sensData)) {
        const sensRecord = sensData as Record<string, string>;
        for (const [antibiotic, result] of Object.entries(sensRecord)) {
          const normalizedResult = result.toLowerCase();
          let classification: 'SENSITIVE' | 'RESISTANT' | 'INTERMEDIATE';
          if (normalizedResult.includes('resist')) {
            classification = 'RESISTANT';
          } else if (normalizedResult.includes('intermed')) {
            classification = 'INTERMEDIATE';
          } else {
            classification = 'SENSITIVE';
          }
          resistanceData.push({
            microorganism: micro,
            antibiotic,
            result: classification,
          });
        }
      }
    }

    return {
      infectionsBySector: Array.from(sectorCounts.entries())
        .map(([sector, count]) => ({ sector, count }))
        .sort((a, b) => b.count - a.count),
      topMicroorganisms: Array.from(microCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      resistanceProfile: resistanceData,
      monthlyInfections: Array.from(monthCounts.entries())
        .map(([month, count]) => ({ month, count })),
    };
  }

  async createNotification(
    tenantId: string,
    userId: string,
    dto: CompulsoryNotificationDto,
  ): Promise<CompulsoryNotification> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
      select: { id: true, fullName: true, cpf: true, birthDate: true, gender: true, city: true, state: true },
    });

    if (!patient) {
      throw new NotFoundException(`Paciente com ID "${dto.patientId}" não encontrado.`);
    }

    // Generate SINAN-like JSON data
    const sinanData: Record<string, unknown> = {
      tipoNotificacao: 'Individual',
      agravo: dto.disease,
      cidCode: dto.cidCode,
      dataNotificacao: dto.notificationDate,
      dataPrimeirosSintomas: dto.symptomsDate,
      criterioConfirmacao: dto.confirmationCriteria,
      paciente: {
        nome: patient.fullName,
        cpf: patient.cpf,
        dataNascimento: patient.birthDate.toISOString().split('T')[0],
        sexo: patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Feminino' : 'Outro',
        municipio: patient.city,
        uf: patient.state,
      },
      unidadeNotificadora: tenantId,
      notificadoPorId: userId,
      observacoes: dto.observations ?? null,
    };

    // Store as AuditLog entry with CREATE action
    const auditEntry = await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CREATE',
        entity: 'CompulsoryNotification',
        entityId: dto.patientId,
        newData: sinanData as Prisma.InputJsonValue,
        ipAddress: '0.0.0.0',
        userAgent: 'VoxPEP-CCIH',
      },
    });

    return {
      id: auditEntry.id,
      patientId: dto.patientId,
      patientName: patient.fullName,
      disease: dto.disease,
      cidCode: dto.cidCode,
      notificationDate: new Date(dto.notificationDate),
      symptomsDate: new Date(dto.symptomsDate),
      confirmationCriteria: dto.confirmationCriteria,
      observations: dto.observations ?? null,
      sinanData,
      createdAt: auditEntry.timestamp,
    };
  }

  async getNotifications(tenantId: string, filters?: { page?: number; pageSize?: number }) {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          tenantId,
          entity: 'CompulsoryNotification',
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: pageSize,
        include: {
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          tenantId,
          entity: 'CompulsoryNotification',
        },
      }),
    ]);

    return {
      data: data.map((entry) => {
        const values = (entry.newData ?? {}) as Record<string, unknown>;
        return {
          id: entry.id,
          patientId: entry.entityId,
          disease: values['agravo'] as string,
          cidCode: values['cidCode'] as string,
          notificationDate: values['dataNotificacao'] as string,
          symptomsDate: values['dataPrimeirosSintomas'] as string,
          notifiedBy: entry.user?.name ?? 'Desconhecido',
          createdAt: entry.timestamp,
        };
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
