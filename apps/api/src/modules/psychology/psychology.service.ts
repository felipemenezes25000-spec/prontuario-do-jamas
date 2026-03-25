import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePsychologyAssessmentDto,
  CreatePsychologyTreatmentPlanDto,
  RecordPsychologySessionDto,
  SuicideRiskAssessmentDto,
} from './dto/create-psychology.dto';

@Injectable()
export class PsychologyService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDocData(tenantId: string, patientId: string, authorId: string, subType: string, title: string, content: Record<string, unknown>, encounterId?: string) {
    return {
      tenantId,
      patientId,
      authorId,
      encounterId: encounterId ?? null,
      type: 'CUSTOM' as const,
      title: `[PSYCHOLOGY:${subType}] ${title}`,
      content: JSON.stringify(content),
      status: 'FINAL' as const,
    };
  }

  async createAssessment(tenantId: string, dto: CreatePsychologyAssessmentDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'ASSESSMENT',
        `Avaliação Psicométrica - ${dto.scale}`,
        {
          scale: dto.scale,
          score: dto.score,
          interpretation: dto.interpretation,
          responses: dto.responses,
          clinicalImpression: dto.clinicalImpression,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });
  }

  async createTreatmentPlan(tenantId: string, dto: CreatePsychologyTreatmentPlanDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'TREATMENT_PLAN',
        `Plano Terapêutico - ${dto.therapeuticApproach}`,
        {
          therapeuticApproach: dto.therapeuticApproach,
          goals: dto.goals,
          sessionsPerWeek: dto.sessionsPerWeek,
          estimatedDuration: dto.estimatedDuration,
          interventions: dto.interventions,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });
  }

  async recordSession(tenantId: string, id: string, dto: RecordPsychologySessionDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId, title: { startsWith: '[PSYCHOLOGY:' } },
    });
    if (!doc) throw new NotFoundException(`Psychology record "${id}" not found`);

    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        doc.patientId,
        dto.authorId,
        'SESSION',
        'Sessão de Psicoterapia',
        {
          parentRecordId: id,
          sessionType: dto.sessionType,
          themes: dto.themes,
          interventions: dto.interventions,
          patientPresentation: dto.patientPresentation,
          evolution: dto.evolution,
          notes: dto.notes,
        },
        doc.encounterId ?? undefined,
      ),
    });
  }

  async createSuicideRiskAssessment(tenantId: string, dto: SuicideRiskAssessmentDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'SUICIDE_RISK',
        `Avaliação Risco Suicídio - ${dto.riskLevel}`,
        {
          riskLevel: dto.riskLevel,
          hasIdeation: dto.hasIdeation,
          hasPlan: dto.hasPlan,
          hasMeans: dto.hasMeans,
          hasIntention: dto.hasIntention,
          previousAttempts: dto.previousAttempts,
          protectiveFactors: dto.protectiveFactors,
          riskFactors: dto.riskFactors,
          safetyPlan: dto.safetyPlan,
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
        title: { startsWith: '[PSYCHOLOGY:' },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });
  }
}
