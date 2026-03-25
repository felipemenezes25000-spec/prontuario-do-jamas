import {
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOTAssessmentDto, CreateOTRehabPlanDto } from './dto/create-occupational-therapy.dto';

@Injectable()
export class OccupationalTherapyService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDocData(tenantId: string, patientId: string, authorId: string, subType: string, title: string, content: Record<string, unknown>, encounterId?: string) {
    return {
      tenantId,
      patientId,
      authorId,
      encounterId: encounterId ?? null,
      type: 'CUSTOM' as const,
      title: `[OT:${subType}] ${title}`,
      content: JSON.stringify(content),
      status: 'FINAL' as const,
    };
  }

  async createAssessment(tenantId: string, dto: CreateOTAssessmentDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'ASSESSMENT',
        'Avaliação de Terapia Ocupacional',
        {
          adlAssessment: dto.adlAssessment,
          iadlAssessment: dto.iadlAssessment,
          fimScore: dto.fimScore,
          barthIndex: dto.barthIndex,
          cognitiveScreening: dto.cognitiveScreening,
          upperExtremityFunction: dto.upperExtremityFunction,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });
  }

  async createRehabPlan(tenantId: string, dto: CreateOTRehabPlanDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'REHAB_PLAN',
        'Plano de Reabilitação Ocupacional',
        {
          goals: dto.goals,
          interventions: dto.interventions,
          adaptiveEquipment: dto.adaptiveEquipment,
          homeModifications: dto.homeModifications,
          sessionsPerWeek: dto.sessionsPerWeek,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });
  }

  async findByPatient(tenantId: string, patientId: string) {
    return this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        title: { startsWith: '[OT:' },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });
  }
}
