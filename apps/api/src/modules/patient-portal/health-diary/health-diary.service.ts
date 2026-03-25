import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

interface DiaryEntry {
  id: string;
  patientId: string;
  tenantId: string;
  entryType: string;
  date: string;
  data: Record<string, unknown>;
  notes?: string;
  createdAt: string;
}

@Injectable()
export class HealthDiaryService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolvePatientId(tenantId: string, userEmail: string): Promise<string> {
    const patient = await this.prisma.patient.findFirst({
      where: { tenantId, email: userEmail, isActive: true },
      select: { id: true },
    });
    if (!patient) {
      throw new ForbiddenException('Nenhum registro de paciente vinculado a esta conta.');
    }
    return patient.id;
  }

  async addEntry(
    tenantId: string,
    userEmail: string,
    dto: {
      entryType: string;
      date?: string;
      systolicBP?: number;
      diastolicBP?: number;
      glucose?: number;
      glucoseMealContext?: string;
      symptoms?: string[];
      mood?: string;
      exerciseType?: string;
      exerciseDuration?: number;
      weight?: number;
      temperature?: number;
      painScale?: number;
      notes?: string;
    },
  ) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);
    const userId = (await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    }))!.id;

    const entry: DiaryEntry = {
      id: crypto.randomUUID(),
      patientId,
      tenantId,
      entryType: dto.entryType,
      date: dto.date ?? new Date().toISOString(),
      data: {
        systolicBP: dto.systolicBP,
        diastolicBP: dto.diastolicBP,
        glucose: dto.glucose,
        glucoseMealContext: dto.glucoseMealContext,
        symptoms: dto.symptoms,
        mood: dto.mood,
        exerciseType: dto.exerciseType,
        exerciseDuration: dto.exerciseDuration,
        weight: dto.weight,
        temperature: dto.temperature,
        painScale: dto.painScale,
      },
      notes: dto.notes,
      createdAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId: userId,
        type: 'CUSTOM',
        title: `[DIARY:${dto.entryType}] ${new Date(entry.date).toLocaleDateString('pt-BR')}`,
        content: JSON.stringify(entry),
        status: 'DRAFT',
      },
    });

    return { entryId: doc.id, entryType: dto.entryType, date: entry.date };
  }

  async listEntries(
    tenantId: string,
    userEmail: string,
    options: {
      entryType?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      tenantId,
      patientId,
      type: 'CUSTOM',
      title: { startsWith: options.entryType ? `[DIARY:${options.entryType}]` : '[DIARY:' },
    };

    if (options.dateFrom || options.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(options.dateFrom);
      if (options.dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(options.dateTo);
    }

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, content: true, createdAt: true },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    const data = docs.map((d) => {
      const entry = JSON.parse(d.content ?? '{}') as DiaryEntry;
      return {
        entryId: d.id,
        entryType: entry.entryType,
        date: entry.date,
        data: entry.data,
        notes: entry.notes,
        createdAt: entry.createdAt,
      };
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getEntryDetail(tenantId: string, userEmail: string, entryId: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: entryId, tenantId, patientId, type: 'CUSTOM', title: { startsWith: '[DIARY:' } },
    });
    if (!doc) throw new NotFoundException('Registro do diário não encontrado.');

    const entry = JSON.parse(doc.content ?? '{}') as DiaryEntry;
    return { entryId: doc.id, ...entry };
  }

  async deleteEntry(tenantId: string, userEmail: string, entryId: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: entryId, tenantId, patientId, type: 'CUSTOM', title: { startsWith: '[DIARY:' } },
    });
    if (!doc) throw new NotFoundException('Registro do diário não encontrado.');

    await this.prisma.clinicalDocument.update({
      where: { id: entryId },
      data: { status: 'VOIDED' },
    });

    return { entryId, status: 'DELETED' };
  }

  async getTrendData(
    tenantId: string,
    userEmail: string,
    entryType: string,
    field: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const where: Record<string, unknown> = {
      tenantId,
      patientId,
      type: 'CUSTOM',
      title: { startsWith: `[DIARY:${entryType}]` },
      status: { not: 'VOIDED' },
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo);
    }

    const docs = await this.prisma.clinicalDocument.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: { content: true, createdAt: true },
      take: 100,
    });

    const trendPoints = docs
      .map((d) => {
        const entry = JSON.parse(d.content ?? '{}') as DiaryEntry;
        const value = entry.data[field];
        if (value === undefined || value === null) return null;
        return { date: entry.date, value: Number(value) };
      })
      .filter(Boolean);

    return { entryType, field, dataPoints: trendPoints.length, trend: trendPoints };
  }

  // Doctor view: get patient diary entries for clinical review
  async getDoctorView(tenantId: string, patientId: string, entryType?: string) {
    const where: Record<string, unknown> = {
      tenantId,
      patientId,
      type: 'CUSTOM',
      title: { startsWith: entryType ? `[DIARY:${entryType}]` : '[DIARY:' },
      status: { not: 'VOIDED' },
    };

    const docs = await this.prisma.clinicalDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, content: true, createdAt: true },
      take: 50,
    });

    return docs.map((d) => {
      const entry = JSON.parse(d.content ?? '{}') as DiaryEntry;
      return {
        entryId: d.id,
        entryType: entry.entryType,
        date: entry.date,
        data: entry.data,
        notes: entry.notes,
      };
    });
  }
}
