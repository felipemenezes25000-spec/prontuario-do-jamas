import {
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePalliativeAssessmentDto,
  CreateAdvanceDirectivesDto,
  CreatePalliativeCarePlanDto,
} from './dto/create-palliative-care.dto';

@Injectable()
export class PalliativeCareService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDocData(tenantId: string, patientId: string, authorId: string, subType: string, title: string, content: Record<string, unknown>, encounterId?: string) {
    return {
      tenantId,
      patientId,
      authorId,
      encounterId: encounterId ?? null,
      type: 'CUSTOM' as const,
      title: `[PALLIATIVE:${subType}] ${title}`,
      content: JSON.stringify(content),
      status: 'FINAL' as const,
    };
  }

  async createAssessment(tenantId: string, dto: CreatePalliativeAssessmentDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'ASSESSMENT',
        `Avaliação Paliativa - PPS ${dto.ppsScore ?? 'N/A'}`,
        {
          ppsScore: dto.ppsScore,
          esasScores: dto.esasScores,
          prognosis: dto.prognosis,
          symptomManagement: dto.symptomManagement,
          psychosocialNeeds: dto.psychosocialNeeds,
          spiritualNeeds: dto.spiritualNeeds,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });
  }

  async createAdvanceDirectives(tenantId: string, dto: CreateAdvanceDirectivesDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'ADVANCE_DIRECTIVES',
        'Diretivas Antecipadas de Vontade',
        {
          resuscitationStatus: dto.resuscitationStatus,
          preferences: dto.preferences,
          healthcareProxy: dto.healthcareProxy,
          proxyContact: dto.proxyContact,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });
  }

  async createCarePlan(tenantId: string, dto: CreatePalliativeCarePlanDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'CARE_PLAN',
        'Plano de Cuidados Paliativos',
        {
          goals: dto.goals,
          painManagement: dto.painManagement,
          symptomControl: dto.symptomControl,
          familySupport: dto.familySupport,
          comfortMeasures: dto.comfortMeasures,
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
        title: { startsWith: '[PALLIATIVE:' },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });
  }
}
