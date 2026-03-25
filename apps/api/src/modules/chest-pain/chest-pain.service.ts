import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ActivateChestPainDto,
  ChestPainScoresDto,
  UpdateChestPainChecklistDto,
} from './dto/create-chest-pain.dto';

@Injectable()
export class ChestPainService {
  constructor(private readonly prisma: PrismaService) {}

  async activate(tenantId: string, authorId: string, dto: ActivateChestPainDto) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: 'Chest Pain Protocol Activation',
        content: JSON.stringify({
          documentType: 'CHEST_PAIN_PROTOCOL',
          suspectedType: dto.suspectedType ?? 'UNDETERMINED',
          symptomOnsetAt: dto.symptomOnsetAt,
          symptoms: dto.symptoms,
          initialEcgFindings: dto.initialEcgFindings,
          initialTroponin: dto.initialTroponin,
          observations: dto.observations,
          activatedAt: new Date().toISOString(),
          status: 'ACTIVE',
          scores: {},
          checklist: {},
          timeline: [
            { event: 'CHEST_PAIN_PROTOCOL_ACTIVATED', at: new Date().toISOString(), by: authorId },
          ],
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, status: 'ACTIVE', activatedAt: doc.createdAt };
  }

  private async getDoc(tenantId: string, id: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId, type: 'CUSTOM' },
    });
    if (!doc) throw new NotFoundException(`Chest pain protocol "${id}" not found`);
    return doc;
  }

  async updateScores(tenantId: string, authorId: string, protocolId: string, dto: ChestPainScoresDto) {
    const doc = await this.getDoc(tenantId, protocolId);
    const existing = JSON.parse(doc.content ?? '{}');
    const scores = { ...existing.scores, ...dto };
    const timeline = existing.timeline ?? [];
    timeline.push({ event: 'SCORES_UPDATED', at: new Date().toISOString(), by: authorId, data: dto });

    await this.prisma.clinicalDocument.update({
      where: { id: protocolId },
      data: { content: JSON.stringify({ ...existing, scores, timeline }) },
    });

    return { id: protocolId, scores };
  }

  async updateChecklist(tenantId: string, authorId: string, protocolId: string, dto: UpdateChestPainChecklistDto) {
    const doc = await this.getDoc(tenantId, protocolId);
    const existing = JSON.parse(doc.content ?? '{}');
    const checklist = { ...existing.checklist, ...dto };
    const timeline = existing.timeline ?? [];

    if (dto.ecgWithin10Min) {
      timeline.push({ event: 'ECG_DONE', at: dto.ecgDoneAt ?? new Date().toISOString(), by: authorId });
    }
    if (dto.pciPerformed) {
      timeline.push({ event: 'PCI_PERFORMED', at: dto.pciPerformedAt ?? new Date().toISOString(), by: authorId });
    }

    await this.prisma.clinicalDocument.update({
      where: { id: protocolId },
      data: { content: JSON.stringify({ ...existing, checklist, timeline }) },
    });

    return { id: protocolId, checklist };
  }

  async getTimeline(tenantId: string, protocolId: string) {
    const doc = await this.getDoc(tenantId, protocolId);
    const content = JSON.parse(doc.content ?? '{}');
    const timeline = content.timeline ?? [];

    let doorToBalloonMinutes: number | null = null;
    const activationEvent = timeline.find((e: { event: string }) => e.event === 'CHEST_PAIN_PROTOCOL_ACTIVATED');
    const pciEvent = timeline.find((e: { event: string }) => e.event === 'PCI_PERFORMED');

    if (activationEvent && pciEvent) {
      doorToBalloonMinutes = Math.round(
        (new Date(pciEvent.at).getTime() - new Date(activationEvent.at).getTime()) / 60000,
      );
    }

    return {
      id: protocolId,
      timeline,
      doorToBalloonMinutes,
      target: 90,
      withinTarget: doorToBalloonMinutes !== null ? doorToBalloonMinutes <= 90 : null,
    };
  }

  async getActiveCases(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: 'Chest Pain Protocol Activation',
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
