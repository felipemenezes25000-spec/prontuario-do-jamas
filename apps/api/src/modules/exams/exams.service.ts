import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExamRequestDto } from './dto/create-exam-request.dto';
import { BulkExamRequestDto } from './dto/bulk-exam-request.dto';
import { AddExamResultDto } from './dto/add-exam-result.dto';
import { ExamType } from '@prisma/client';

interface LabResultEntry {
  analyte: string;
  value: string;
  unit?: string;
  referenceMin?: number;
  referenceMax?: number;
  reference?: string;
  flag?: string;
}

export interface TrendingPoint {
  date: string;
  value: number;
  unit: string;
  referenceMin: number | null;
  referenceMax: number | null;
  isAbnormal: boolean;
}

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async request(requestedById: string, dto: CreateExamRequestDto) {
    return this.prisma.examResult.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        examName: dto.examName,
        examCode: dto.examCode,
        examType: dto.examType,
        imageModality: dto.imageModality,
        requestedById,
        requestedAt: new Date(),
        status: 'REQUESTED',
      },
    });
  }

  async bulkRequest(requestedById: string, dto: BulkExamRequestDto) {
    const results = await Promise.all(
      dto.items.map((item) =>
        this.prisma.examResult.create({
          data: {
            patientId: dto.patientId,
            encounterId: dto.encounterId,
            examName: item.examName,
            examCode: item.examCode,
            examType: item.examType,
            requestedById,
            requestedAt: new Date(),
            status: 'REQUESTED',
          },
        }),
      ),
    );
    return { count: results.length, items: results };
  }

  async getCatalog(
    tenantId: string,
    options: { search?: string; examType?: string },
  ) {
    const where: Record<string, unknown> = {
      tenantId,
      isActive: true,
    };

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    if (options.examType) {
      where.examType = options.examType as ExamType;
    }

    return this.prisma.examCatalog.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 200,
    });
  }

  async getTrending(patientId: string, analyte: string, limit: number): Promise<TrendingPoint[]> {
    const exams = await this.prisma.examResult.findMany({
      where: {
        patientId,
        status: 'COMPLETED',
        labResults: { not: null as unknown as undefined },
      },
      orderBy: { completedAt: 'asc' },
      select: {
        labResults: true,
        completedAt: true,
        createdAt: true,
      },
    });

    const points: TrendingPoint[] = [];
    const analyteLower = analyte.toLowerCase();

    for (const exam of exams) {
      if (!exam.labResults || !Array.isArray(exam.labResults)) continue;

      for (const entry of exam.labResults as unknown as LabResultEntry[]) {
        if (
          typeof entry === 'object' &&
          entry !== null &&
          'analyte' in entry &&
          'value' in entry &&
          entry.analyte.toLowerCase().includes(analyteLower)
        ) {
          const numericValue = parseFloat(String(entry.value).replace(',', '.'));
          if (isNaN(numericValue)) continue;

          const refMin = entry.referenceMin ?? null;
          const refMax = entry.referenceMax ?? null;

          let isAbnormal = false;
          if (refMin !== null && numericValue < refMin) isAbnormal = true;
          if (refMax !== null && numericValue > refMax) isAbnormal = true;
          if (entry.flag === 'HIGH' || entry.flag === 'LOW' || entry.flag === 'CRITICAL') {
            isAbnormal = true;
          }

          points.push({
            date: (exam.completedAt ?? exam.createdAt).toISOString(),
            value: numericValue,
            unit: entry.unit ?? '',
            referenceMin: refMin,
            referenceMax: refMax,
            isAbnormal,
          });
        }
      }
    }

    return points.slice(-limit);
  }

  async addResults(id: string, reviewedById: string, dto: AddExamResultDto) {
    const _exam = await this.findById(id);

    return this.prisma.examResult.update({
      where: { id },
      data: {
        labResults: (dto.labResults as any) ?? undefined,
        imageUrl: dto.imageUrl,
        radiologistReport: dto.radiologistReport,
        status: 'COMPLETED',
        completedAt: new Date(),
        reviewedAt: new Date(),
        reviewedById,
      },
    });
  }

  async findAll(
    tenantId: string,
    options: { page?: number; pageSize?: number; status?: string; patientId?: string },
  ) {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      patient: { tenantId },
    };
    if (options.status) {
      where.status = options.status;
    }
    if (options.patientId) {
      where.patientId = options.patientId;
    }

    const [data, total] = await Promise.all([
      this.prisma.examResult.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, fullName: true, mrn: true } },
          requestedBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.examResult.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: string) {
    const exam = await this.prisma.examResult.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        requestedBy: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID "${id}" not found`);
    }

    return exam;
  }

  async findByPatient(patientId: string) {
    return this.prisma.examResult.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        requestedBy: { select: { id: true, name: true } },
      },
    });
  }

  async findByEncounter(encounterId: string) {
    return this.prisma.examResult.findMany({
      where: { encounterId },
      orderBy: { createdAt: 'desc' },
      include: {
        requestedBy: { select: { id: true, name: true } },
      },
    });
  }

  async getPending(tenantId: string) {
    return this.prisma.examResult.findMany({
      where: {
        status: { in: ['REQUESTED', 'SCHEDULED', 'COLLECTED', 'IN_PROGRESS'] },
        patient: { tenantId },
      },
      orderBy: { requestedAt: 'asc' },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    });
  }
}
