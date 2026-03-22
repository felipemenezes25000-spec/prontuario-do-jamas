import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExamRequestDto } from './dto/create-exam-request.dto';
import { AddExamResultDto } from './dto/add-exam-result.dto';

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

  async addResults(id: string, reviewedById: string, dto: AddExamResultDto) {
    const exam = await this.findById(id);

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
