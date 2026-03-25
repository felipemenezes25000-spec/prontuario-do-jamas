import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ActivateStrokeCodeDto,
  CreateNihssAssessmentDto,
  UpdateStrokeChecklistDto,
} from './dto/create-stroke-protocol.dto';

@Injectable()
export class StrokeProtocolService {
  constructor(private readonly prisma: PrismaService) {}

  async activateStrokeCode(tenantId: string, authorId: string, dto: ActivateStrokeCodeDto) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: 'Stroke Code Activation',
        content: JSON.stringify({
          documentType: 'STROKE_PROTOCOL',
          suspectedType: dto.suspectedType ?? 'UNKNOWN',
          symptomOnsetAt: dto.symptomOnsetAt,
          lastKnownWellAt: dto.lastKnownWellAt,
          symptoms: dto.symptoms,
          observations: dto.observations,
          activatedAt: new Date().toISOString(),
          status: 'ACTIVE',
          timeline: [
            { event: 'STROKE_CODE_ACTIVATED', at: new Date().toISOString(), by: authorId },
          ],
          nihssAssessments: [],
          checklist: {},
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, status: 'ACTIVE', activatedAt: doc.createdAt };
  }

  private async getStrokeDoc(tenantId: string, id: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId, type: 'CUSTOM' },
    });
    if (!doc) throw new NotFoundException(`Stroke protocol "${id}" not found`);
    return doc;
  }

  async createNihssAssessment(tenantId: string, authorId: string, strokeId: string, dto: CreateNihssAssessmentDto) {
    const doc = await this.getStrokeDoc(tenantId, strokeId);
    const existing = JSON.parse(doc.content ?? '{}');
    const nihssAssessments = existing.nihssAssessments ?? [];
    const totalScore = dto.items.reduce((s, i) => s + i.score, 0);

    const severity =
      totalScore === 0 ? 'NO_STROKE'
      : totalScore <= 4 ? 'MINOR'
      : totalScore <= 15 ? 'MODERATE'
      : totalScore <= 20 ? 'MODERATE_TO_SEVERE'
      : 'SEVERE';

    const assessment = {
      authorId,
      items: dto.items,
      totalScore,
      severity,
      observations: dto.observations,
      assessedAt: new Date().toISOString(),
    };
    nihssAssessments.push(assessment);

    const timeline = existing.timeline ?? [];
    timeline.push({
      event: `NIHSS_ASSESSMENT (Score: ${totalScore} - ${severity})`,
      at: new Date().toISOString(),
      by: authorId,
    });

    await this.prisma.clinicalDocument.update({
      where: { id: strokeId },
      data: { content: JSON.stringify({ ...existing, nihssAssessments, timeline }) },
    });

    return { id: strokeId, nihss: assessment };
  }

  async updateChecklist(tenantId: string, authorId: string, strokeId: string, dto: UpdateStrokeChecklistDto) {
    const doc = await this.getStrokeDoc(tenantId, strokeId);
    const existing = JSON.parse(doc.content ?? '{}');
    const checklist = { ...existing.checklist, ...dto };
    const timeline = existing.timeline ?? [];

    // Add timeline events for key milestones
    if (dto.imagingDone) {
      timeline.push({ event: 'IMAGING_COMPLETED', at: dto.imagingDoneAt ?? new Date().toISOString(), by: authorId });
    }
    if (dto.tpaAdministered) {
      timeline.push({ event: 'TPA_ADMINISTERED', at: dto.tpaAdministeredAt ?? new Date().toISOString(), by: authorId });
    }
    if (dto.thrombectomyPerformed) {
      timeline.push({ event: 'THROMBECTOMY_PERFORMED', at: dto.thrombectomyPerformedAt ?? new Date().toISOString(), by: authorId });
    }

    await this.prisma.clinicalDocument.update({
      where: { id: strokeId },
      data: { content: JSON.stringify({ ...existing, checklist, timeline }) },
    });

    return { id: strokeId, checklist };
  }

  async getTimeline(tenantId: string, strokeId: string) {
    const doc = await this.getStrokeDoc(tenantId, strokeId);
    const content = JSON.parse(doc.content ?? '{}');

    const timeline = content.timeline ?? [];
    // Calculate door-to-needle time if tPA was given
    let doorToNeedleMinutes: number | null = null;
    const activationEvent = timeline.find((e: { event: string }) => e.event === 'STROKE_CODE_ACTIVATED');
    const tpaEvent = timeline.find((e: { event: string }) => e.event === 'TPA_ADMINISTERED');

    if (activationEvent && tpaEvent) {
      doorToNeedleMinutes = Math.round(
        (new Date(tpaEvent.at).getTime() - new Date(activationEvent.at).getTime()) / 60000,
      );
    }

    return {
      id: strokeId,
      timeline,
      doorToNeedleMinutes,
      target: 60,
      withinTarget: doorToNeedleMinutes !== null ? doorToNeedleMinutes <= 60 : null,
    };
  }

  async getActiveCases(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: 'Stroke Code Activation',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        author: { select: { id: true, name: true } },
      },
    });

    return docs
      .map((d) => ({
        id: d.id,
        patient: d.patient,
        author: d.author,
        ...JSON.parse(d.content ?? '{}'),
        createdAt: d.createdAt,
      }))
      .filter((d) => d.status === 'ACTIVE');
  }
}
