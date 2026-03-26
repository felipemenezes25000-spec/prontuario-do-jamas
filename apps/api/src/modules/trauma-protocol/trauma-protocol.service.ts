import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ActivateTraumaDto,
  RecordPrimarySurveyDto,
  RecordFastExamDto,
  RecordTraumaScoresDto,
} from './dto/trauma-protocol.dto';

export interface TimelineEvent {
  event: string;
  at: string;
  by: string;
  data?: Record<string, unknown>;
}

interface TraumaContent {
  documentType: 'TRAUMA_PROTOCOL';
  activationLevel: string;
  mechanism: string;
  mechanismDescription: string;
  sceneDescription?: string;
  preHospitalGcs?: number;
  activatedAt: string;
  status: 'ACTIVE' | 'COMPLETED';
  timeline: TimelineEvent[];
  primarySurvey?: Record<string, unknown>;
  fastExam?: Record<string, unknown>;
  scores?: Record<string, unknown>;
}

@Injectable()
export class TraumaProtocolService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Activate Trauma ────────────────────────────────────────────────────

  async activateTrauma(tenantId: string, authorId: string, dto: ActivateTraumaDto) {
    const now = new Date().toISOString();

    const content: TraumaContent = {
      documentType: 'TRAUMA_PROTOCOL',
      activationLevel: dto.activationLevel,
      mechanism: dto.mechanism,
      mechanismDescription: dto.mechanismDescription,
      sceneDescription: dto.sceneDescription,
      preHospitalGcs: dto.preHospitalGcs,
      activatedAt: now,
      status: 'ACTIVE',
      timeline: [
        {
          event: `[TRAUMA] CODE_ACTIVATED — Level ${dto.activationLevel}, Mechanism ${dto.mechanism}`,
          at: now,
          by: authorId,
        },
      ],
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[TRAUMA] Trauma Protocol Activation',
        content: JSON.stringify(content),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, status: 'ACTIVE', activatedAt: now, activationLevel: dto.activationLevel };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private async getTraumaDoc(tenantId: string, traumaId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: traumaId, tenantId, type: 'CUSTOM' },
    });
    if (!doc) throw new NotFoundException(`Trauma protocol "${traumaId}" not found`);
    return doc;
  }

  private parseContent(content: string | null): TraumaContent {
    return JSON.parse(content ?? '{}') as TraumaContent;
  }

  // ─── Primary Survey (ABCDE) ─────────────────────────────────────────────

  async recordPrimarySurvey(tenantId: string, authorId: string, dto: RecordPrimarySurveyDto) {
    const doc = await this.getTraumaDoc(tenantId, dto.traumaId);
    const existing = this.parseContent(doc.content);

    const gcsTotal = dto.disability.gcsEye + dto.disability.gcsVerbal + dto.disability.gcsMotor;

    const primarySurvey = {
      airway: dto.airway,
      breathing: dto.breathing,
      circulation: dto.circulation,
      disability: {
        ...dto.disability,
        gcsTotal,
      },
      exposure: dto.exposure,
      recordedAt: new Date().toISOString(),
      recordedBy: authorId,
    };

    const timeline = existing.timeline ?? [];
    timeline.push({
      event: `[TRAUMA] PRIMARY_SURVEY — GCS ${gcsTotal} (E${dto.disability.gcsEye}V${dto.disability.gcsVerbal}M${dto.disability.gcsMotor})`,
      at: new Date().toISOString(),
      by: authorId,
    });

    if (dto.airway.status === 'COMPROMISED') {
      timeline.push({ event: '[TRAUMA] ALERT — Airway COMPROMISED', at: new Date().toISOString(), by: authorId });
    }
    if (dto.circulation.externalBleeding) {
      timeline.push({
        event: `[TRAUMA] ALERT — External bleeding at ${dto.circulation.bleedingSite ?? 'unspecified site'}`,
        at: new Date().toISOString(),
        by: authorId,
      });
    }

    await this.prisma.clinicalDocument.update({
      where: { id: dto.traumaId },
      data: { content: JSON.stringify({ ...existing, primarySurvey, timeline }) },
    });

    return { id: dto.traumaId, gcsTotal, primarySurvey };
  }

  // ─── FAST Exam ──────────────────────────────────────────────────────────

  async recordFastExam(tenantId: string, authorId: string, dto: RecordFastExamDto) {
    const doc = await this.getTraumaDoc(tenantId, dto.traumaId);
    const existing = this.parseContent(doc.content);

    const fastExam = {
      rightUpperQuadrant: dto.rightUpperQuadrant,
      leftUpperQuadrant: dto.leftUpperQuadrant,
      suprapubic: dto.suprapubic,
      subxiphoid: dto.subxiphoid,
      overallResult: dto.overallResult,
      notes: dto.notes,
      recordedAt: new Date().toISOString(),
      recordedBy: authorId,
    };

    const timeline = existing.timeline ?? [];
    timeline.push({
      event: `[TRAUMA] FAST_EXAM — Overall: ${dto.overallResult}`,
      at: new Date().toISOString(),
      by: authorId,
    });

    if (dto.overallResult === 'POSITIVE') {
      timeline.push({
        event: '[TRAUMA] ALERT — FAST POSITIVE — Consider immediate surgical consultation',
        at: new Date().toISOString(),
        by: authorId,
      });
    }

    await this.prisma.clinicalDocument.update({
      where: { id: dto.traumaId },
      data: { content: JSON.stringify({ ...existing, fastExam, timeline }) },
    });

    return { id: dto.traumaId, fastExam };
  }

  // ─── Trauma Scores ──────────────────────────────────────────────────────

  async recordTraumaScores(tenantId: string, authorId: string, dto: RecordTraumaScoresDto) {
    const doc = await this.getTraumaDoc(tenantId, dto.traumaId);
    const existing = this.parseContent(doc.content);

    // Auto-calculate RTS if primary survey data exists
    let rts = dto.rts;
    if (rts === undefined && existing.primarySurvey) {
      const survey = existing.primarySurvey as {
        disability?: { gcsTotal?: number };
        circulation?: { systolicBP?: number };
        breathing?: { respiratoryRate?: number };
      };
      const gcs = survey.disability?.gcsTotal;
      const sbp = survey.circulation?.systolicBP;
      const rr = survey.breathing?.respiratoryRate;
      if (gcs !== undefined && sbp !== undefined && rr !== undefined) {
        rts = this.calculateRts(gcs, sbp, rr);
      }
    }

    const scores = {
      iss: dto.iss,
      rts: rts !== undefined ? Math.round(rts * 1000) / 1000 : undefined,
      triss: dto.triss,
      injuries: dto.injuries,
      recordedAt: new Date().toISOString(),
      recordedBy: authorId,
    };

    const timeline = existing.timeline ?? [];
    const scoreParts: string[] = [];
    if (dto.iss !== undefined) scoreParts.push(`ISS=${dto.iss}`);
    if (rts !== undefined) scoreParts.push(`RTS=${(Math.round(rts * 1000) / 1000).toString()}`);
    if (dto.triss !== undefined) scoreParts.push(`TRISS=${dto.triss}`);

    timeline.push({
      event: `[TRAUMA] SCORES_RECORDED — ${scoreParts.join(', ')}`,
      at: new Date().toISOString(),
      by: authorId,
    });

    await this.prisma.clinicalDocument.update({
      where: { id: dto.traumaId },
      data: { content: JSON.stringify({ ...existing, scores, timeline }) },
    });

    return { id: dto.traumaId, scores };
  }

  /**
   * RTS = 0.9368*GCS_coded + 0.7326*SBP_coded + 0.2908*RR_coded
   */
  private calculateRts(gcs: number, sbp: number, rr: number): number {
    const gcsCoded = this.codeGcs(gcs);
    const sbpCoded = this.codeSbp(sbp);
    const rrCoded = this.codeRr(rr);

    return 0.9368 * gcsCoded + 0.7326 * sbpCoded + 0.2908 * rrCoded;
  }

  private codeGcs(gcs: number): number {
    if (gcs >= 13) return 4;
    if (gcs >= 9) return 3;
    if (gcs >= 6) return 2;
    if (gcs >= 4) return 1;
    return 0;
  }

  private codeSbp(sbp: number): number {
    if (sbp > 89) return 4;
    if (sbp >= 76) return 3;
    if (sbp >= 50) return 2;
    if (sbp >= 1) return 1;
    return 0;
  }

  private codeRr(rr: number): number {
    if (rr >= 10 && rr <= 29) return 4;
    if (rr > 29) return 3;
    if (rr >= 6 && rr <= 9) return 2;
    if (rr >= 1 && rr <= 5) return 1;
    return 0;
  }

  // ─── Timeline ───────────────────────────────────────────────────────────

  async getTraumaTimeline(tenantId: string, traumaId: string) {
    const doc = await this.getTraumaDoc(tenantId, traumaId);
    const content = this.parseContent(doc.content);
    const timeline = content.timeline ?? [];

    const activationEvent = timeline[0];
    const lastEvent = timeline[timeline.length - 1];
    let elapsedMinutes: number | null = null;

    if (activationEvent && lastEvent) {
      elapsedMinutes = Math.round(
        (new Date(lastEvent.at).getTime() - new Date(activationEvent.at).getTime()) / 60000,
      );
    }

    return {
      id: traumaId,
      activatedAt: content.activatedAt,
      activationLevel: content.activationLevel,
      mechanism: content.mechanism,
      status: content.status,
      timeline,
      elapsedMinutes,
    };
  }

  // ─── Active Traumas ─────────────────────────────────────────────────────

  async getActiveTraumas(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: '[TRAUMA] Trauma Protocol Activation',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        author: { select: { id: true, name: true } },
      },
    });

    return docs
      .map((d) => {
        const parsed = this.parseContent(d.content);
        return {
          id: d.id,
          patient: d.patient,
          author: d.author,
          activationLevel: parsed.activationLevel,
          mechanism: parsed.mechanism,
          mechanismDescription: parsed.mechanismDescription,
          status: parsed.status,
          activatedAt: parsed.activatedAt,
          primarySurvey: parsed.primarySurvey,
          fastExam: parsed.fastExam,
          scores: parsed.scores,
          timelineCount: (parsed.timeline ?? []).length,
          createdAt: d.createdAt,
        };
      })
      .filter((d) => d.status === 'ACTIVE');
  }
}
