import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePhysiotherapyAssessmentDto, CreateTreatmentPlanDto, RecordSessionDto } from './dto/create-physiotherapy.dto';

@Injectable()
export class PhysiotherapyService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDocData(tenantId: string, patientId: string, authorId: string, subType: string, title: string, content: Record<string, unknown>, encounterId?: string) {
    return {
      tenantId,
      patientId,
      authorId,
      encounterId: encounterId ?? null,
      type: 'CUSTOM' as const,
      title: `[PHYSIOTHERAPY:${subType}] ${title}`,
      content: JSON.stringify(content),
      status: 'FINAL' as const,
    };
  }

  async createAssessment(tenantId: string, dto: CreatePhysiotherapyAssessmentDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'ASSESSMENT',
        'Avaliação Funcional',
        {
          diagnosis: dto.diagnosis,
          functionalAssessment: dto.functionalAssessment,
          rangeOfMotion: dto.rangeOfMotion,
          muscleStrength: dto.muscleStrength,
          barthIndex: dto.barthIndex,
          painAssessment: dto.painAssessment,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });
  }

  async createTreatmentPlan(tenantId: string, dto: CreateTreatmentPlanDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'TREATMENT_PLAN',
        'Plano de Tratamento Fisioterapêutico',
        {
          goals: dto.goals,
          exercises: dto.exercises,
          modalities: dto.modalities,
          sessionsPerWeek: dto.sessionsPerWeek,
          estimatedDuration: dto.estimatedDuration,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });
  }

  async recordSession(tenantId: string, id: string, dto: RecordSessionDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId, title: { startsWith: '[PHYSIOTHERAPY:' } },
    });
    if (!doc) throw new NotFoundException(`Physiotherapy record "${id}" not found`);

    const parentContent = doc.content ? JSON.parse(doc.content) : {};

    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        doc.patientId,
        dto.authorId,
        'SESSION',
        'Sessão de Fisioterapia',
        {
          parentRecordId: id,
          procedures: dto.procedures,
          evolution: dto.evolution,
          patientResponse: dto.patientResponse,
          notes: dto.notes,
          sessionNumber: (parentContent.sessionCount ?? 0) + 1,
        },
        doc.encounterId ?? undefined,
      ),
    });
  }

  async findByPatient(tenantId: string, patientId: string) {
    return this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[PHYSIOTHERAPY:' },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });
  }
}
