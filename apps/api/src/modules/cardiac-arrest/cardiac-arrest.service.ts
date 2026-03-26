import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ActivateCodeBlueDto,
  RecordCprCycleDto,
  RecordDefibrillationDto,
  RecordAclsDrugDto,
  RecordAirwayDto,
  TerminateCodeDto,
  CardiacRhythm,
  CodeOutcome,
} from './dto/cardiac-arrest.dto';

// ─── Exported Interfaces ──────────────────────────────────────────────────────

export interface CodeBlueTimelineEvent {
  event: string;
  at: string;
  by: string;
  data?: Record<string, unknown>;
}

export interface CprCycleRecord {
  cycleNumber: number;
  startTime: string;
  endTime: string;
  compressor: string;
  quality?: {
    rate?: number;
    depth?: string;
    fullRecoil: boolean;
  };
}

export interface DefibrillationRecord {
  shockNumber: number;
  energy: number;
  rhythmBefore: CardiacRhythm;
  rhythmAfter: CardiacRhythm;
  time: string;
}

export interface AclsDrugRecord {
  drug: string;
  dose: string;
  route: string;
  time: string;
}

export interface AirwayRecord {
  type: string;
  time: string;
  success: boolean;
  ettSize?: string;
  ettDepth?: string;
  confirmationMethod?: string;
}

export interface CodeBlueContent {
  documentType: 'CARDIAC_ARREST';
  patientId: string;
  encounterId?: string;
  location: string;
  witnessedArrest: boolean;
  initialRhythm: CardiacRhythm;
  bystanderCpr: boolean;
  aedUsed: boolean;
  activatedAt: string;
  status: 'ACTIVE' | 'ROSC' | 'DEATH' | 'TRANSFER';
  timeline: CodeBlueTimelineEvent[];
  cprCycles: CprCycleRecord[];
  defibrillations: DefibrillationRecord[];
  aclsDrugs: AclsDrugRecord[];
  airways: AirwayRecord[];
  outcome?: {
    result: CodeOutcome;
    roscTime?: string;
    timeOfDeath?: string;
    totalDuration: number;
    totalShocks: number;
    totalEpinephrine: number;
    familyNotified: boolean;
    postRoscCare?: string;
  };
}

export interface ListCodesFilters {
  status?: string;
  patientId?: string;
  page?: number;
  limit?: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class CardiacArrestService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Activate Code Blue ─────────────────────────────────────────────────

  async activateCodeBlue(tenantId: string, authorId: string, dto: ActivateCodeBlueDto) {
    const now = new Date().toISOString();

    const content: CodeBlueContent = {
      documentType: 'CARDIAC_ARREST',
      patientId: dto.patientId,
      encounterId: dto.encounterId,
      location: dto.location,
      witnessedArrest: dto.witnessedArrest,
      initialRhythm: dto.initialRhythm,
      bystanderCpr: dto.bystanderCpr,
      aedUsed: dto.aedUsed,
      activatedAt: now,
      status: 'ACTIVE',
      timeline: [
        {
          event: `[CODE_BLUE] ACTIVATED — Rhythm: ${dto.initialRhythm}, Location: ${dto.location}, Witnessed: ${dto.witnessedArrest}`,
          at: now,
          by: authorId,
        },
      ],
      cprCycles: [],
      defibrillations: [],
      aclsDrugs: [],
      airways: [],
    };

    if (dto.bystanderCpr) {
      content.timeline.push({
        event: '[CODE_BLUE] INFO — Bystander CPR performed prior to team arrival',
        at: now,
        by: authorId,
      });
    }

    if (dto.aedUsed) {
      content.timeline.push({
        event: '[CODE_BLUE] INFO — AED used prior to team arrival',
        at: now,
        by: authorId,
      });
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: '[CARDIAC_ARREST] Code Blue Activation',
        content: JSON.stringify(content),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      status: 'ACTIVE',
      activatedAt: now,
      initialRhythm: dto.initialRhythm,
      location: dto.location,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private async getCodeDoc(tenantId: string, codeId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: codeId, tenantId, type: 'CUSTOM' },
    });
    if (!doc) throw new NotFoundException(`Code Blue "${codeId}" not found`);
    return doc;
  }

  private parseContent(content: string | null): CodeBlueContent {
    return JSON.parse(content ?? '{}') as CodeBlueContent;
  }

  // ─── Record CPR Cycle ───────────────────────────────────────────────────

  async recordCprCycle(tenantId: string, codeId: string, dto: RecordCprCycleDto) {
    const doc = await this.getCodeDoc(tenantId, codeId);
    const existing = this.parseContent(doc.content);
    const now = new Date().toISOString();

    const cycle: CprCycleRecord = {
      cycleNumber: dto.cycleNumber,
      startTime: dto.startTime,
      endTime: dto.endTime,
      compressor: dto.compressor,
      quality: dto.quality
        ? { rate: dto.quality.rate, depth: dto.quality.depth, fullRecoil: dto.quality.fullRecoil }
        : undefined,
    };

    existing.cprCycles.push(cycle);

    const qualityInfo = dto.quality
      ? ` — Rate: ${dto.quality.rate ?? 'N/A'}/min, Recoil: ${dto.quality.fullRecoil ? 'Yes' : 'No'}`
      : '';

    existing.timeline.push({
      event: `[CODE_BLUE] CPR_CYCLE #${dto.cycleNumber} — Compressor: ${dto.compressor}${qualityInfo}`,
      at: now,
      by: dto.compressor,
    });

    await this.prisma.clinicalDocument.update({
      where: { id: codeId },
      data: { content: JSON.stringify(existing) },
    });

    return { id: codeId, cycleNumber: dto.cycleNumber, recorded: true };
  }

  // ─── Record Defibrillation ──────────────────────────────────────────────

  async recordDefibrillation(tenantId: string, codeId: string, dto: RecordDefibrillationDto) {
    const doc = await this.getCodeDoc(tenantId, codeId);
    const existing = this.parseContent(doc.content);
    const now = new Date().toISOString();

    const defib: DefibrillationRecord = {
      shockNumber: dto.shockNumber,
      energy: dto.energy,
      rhythmBefore: dto.rhythmBefore,
      rhythmAfter: dto.rhythmAfter,
      time: dto.time,
    };

    existing.defibrillations.push(defib);

    existing.timeline.push({
      event: `[CODE_BLUE] DEFIBRILLATION #${dto.shockNumber} — ${dto.energy}J, ${dto.rhythmBefore} → ${dto.rhythmAfter}`,
      at: now,
      by: 'SYSTEM',
    });

    if (dto.rhythmAfter === CardiacRhythm.ROSC) {
      existing.timeline.push({
        event: '[CODE_BLUE] ALERT — ROSC detected after defibrillation',
        at: now,
        by: 'SYSTEM',
      });
    }

    await this.prisma.clinicalDocument.update({
      where: { id: codeId },
      data: { content: JSON.stringify(existing) },
    });

    return { id: codeId, shockNumber: dto.shockNumber, rhythmAfter: dto.rhythmAfter, recorded: true };
  }

  // ─── Record ACLS Drug ──────────────────────────────────────────────────

  async recordAclsDrug(tenantId: string, codeId: string, dto: RecordAclsDrugDto) {
    const doc = await this.getCodeDoc(tenantId, codeId);
    const existing = this.parseContent(doc.content);
    const now = new Date().toISOString();

    const drugRecord: AclsDrugRecord = {
      drug: dto.drug,
      dose: dto.dose,
      route: dto.route,
      time: dto.time,
    };

    existing.aclsDrugs.push(drugRecord);

    existing.timeline.push({
      event: `[CODE_BLUE] ACLS_DRUG — ${dto.drug} ${dto.dose} ${dto.route} at ${dto.time}`,
      at: now,
      by: 'SYSTEM',
    });

    await this.prisma.clinicalDocument.update({
      where: { id: codeId },
      data: { content: JSON.stringify(existing) },
    });

    return { id: codeId, drug: dto.drug, dose: dto.dose, recorded: true };
  }

  // ─── Record Airway ─────────────────────────────────────────────────────

  async recordAirway(tenantId: string, codeId: string, dto: RecordAirwayDto) {
    const doc = await this.getCodeDoc(tenantId, codeId);
    const existing = this.parseContent(doc.content);
    const now = new Date().toISOString();

    const airwayRecord: AirwayRecord = {
      type: dto.type,
      time: dto.time,
      success: dto.success,
      ettSize: dto.ettSize,
      ettDepth: dto.ettDepth,
      confirmationMethod: dto.confirmationMethod,
    };

    existing.airways.push(airwayRecord);

    const ettInfo = dto.type === 'ETT' && dto.ettSize ? ` — ETT ${dto.ettSize} at ${dto.ettDepth ?? 'N/A'}cm` : '';
    const confirmInfo = dto.confirmationMethod ? `, Confirmed: ${dto.confirmationMethod}` : '';

    existing.timeline.push({
      event: `[CODE_BLUE] AIRWAY — ${dto.type} ${dto.success ? 'SUCCESS' : 'FAILED'}${ettInfo}${confirmInfo}`,
      at: now,
      by: 'SYSTEM',
    });

    if (!dto.success) {
      existing.timeline.push({
        event: `[CODE_BLUE] ALERT — ${dto.type} airway attempt FAILED`,
        at: now,
        by: 'SYSTEM',
      });
    }

    await this.prisma.clinicalDocument.update({
      where: { id: codeId },
      data: { content: JSON.stringify(existing) },
    });

    return { id: codeId, airwayType: dto.type, success: dto.success, recorded: true };
  }

  // ─── Terminate Code ─────────────────────────────────────────────────────

  async terminateCode(tenantId: string, codeId: string, dto: TerminateCodeDto) {
    const doc = await this.getCodeDoc(tenantId, codeId);
    const existing = this.parseContent(doc.content);
    const now = new Date().toISOString();

    existing.status = dto.outcome as 'ROSC' | 'DEATH' | 'TRANSFER';

    existing.outcome = {
      result: dto.outcome,
      roscTime: dto.roscTime,
      timeOfDeath: dto.timeOfDeath,
      totalDuration: dto.totalDuration,
      totalShocks: dto.totalShocks,
      totalEpinephrine: dto.totalEpinephrine,
      familyNotified: dto.familyNotified,
      postRoscCare: dto.postRoscCare,
    };

    if (dto.outcome === CodeOutcome.ROSC) {
      existing.timeline.push({
        event: `[CODE_BLUE] TERMINATED — ROSC at ${dto.roscTime ?? now}, Duration: ${dto.totalDuration}min, Shocks: ${dto.totalShocks}, Epinephrine: ${dto.totalEpinephrine} doses`,
        at: now,
        by: 'SYSTEM',
      });
      if (dto.postRoscCare) {
        existing.timeline.push({
          event: `[CODE_BLUE] POST_ROSC_CARE — ${dto.postRoscCare}`,
          at: now,
          by: 'SYSTEM',
        });
      }
    } else if (dto.outcome === CodeOutcome.DEATH) {
      existing.timeline.push({
        event: `[CODE_BLUE] TERMINATED — Death declared at ${dto.timeOfDeath ?? now}, Duration: ${dto.totalDuration}min, Shocks: ${dto.totalShocks}, Epinephrine: ${dto.totalEpinephrine} doses`,
        at: now,
        by: 'SYSTEM',
      });
    } else {
      existing.timeline.push({
        event: `[CODE_BLUE] TERMINATED — Transfer, Duration: ${dto.totalDuration}min`,
        at: now,
        by: 'SYSTEM',
      });
    }

    existing.timeline.push({
      event: `[CODE_BLUE] FAMILY_NOTIFICATION — ${dto.familyNotified ? 'Family notified' : 'Family NOT YET notified'}`,
      at: now,
      by: 'SYSTEM',
    });

    // Update document title to reflect outcome
    const outcomeTitle =
      dto.outcome === CodeOutcome.ROSC
        ? '[CARDIAC_ARREST] Code Blue — ROSC'
        : dto.outcome === CodeOutcome.DEATH
          ? '[CARDIAC_ARREST] Code Blue — Death'
          : '[CARDIAC_ARREST] Code Blue — Transfer';

    await this.prisma.clinicalDocument.update({
      where: { id: codeId },
      data: {
        title: outcomeTitle,
        content: JSON.stringify(existing),
      },
    });

    return {
      id: codeId,
      outcome: dto.outcome,
      totalDuration: dto.totalDuration,
      totalShocks: dto.totalShocks,
      totalEpinephrine: dto.totalEpinephrine,
      familyNotified: dto.familyNotified,
      status: existing.status,
    };
  }

  // ─── Get Code Timeline ──────────────────────────────────────────────────

  async getCodeTimeline(tenantId: string, codeId: string) {
    const doc = await this.getCodeDoc(tenantId, codeId);
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
      id: codeId,
      activatedAt: content.activatedAt,
      location: content.location,
      initialRhythm: content.initialRhythm,
      witnessedArrest: content.witnessedArrest,
      status: content.status,
      timeline,
      cprCycles: content.cprCycles,
      defibrillations: content.defibrillations,
      aclsDrugs: content.aclsDrugs,
      airways: content.airways,
      outcome: content.outcome,
      elapsedMinutes,
    };
  }

  // ─── List Codes ─────────────────────────────────────────────────────────

  async listCodes(tenantId: string, filters: ListCodesFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId,
      type: 'CUSTOM',
      title: { startsWith: '[CARDIAC_ARREST]' },
    };

    if (filters.patientId) {
      where.patientId = filters.patientId;
    }

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          patient: { select: { id: true, fullName: true, mrn: true } },
          author: { select: { id: true, name: true } },
        },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    const items = docs
      .map((d) => {
        const parsed = this.parseContent(d.content);
        return {
          id: d.id,
          patient: d.patient,
          author: d.author,
          location: parsed.location,
          initialRhythm: parsed.initialRhythm,
          witnessedArrest: parsed.witnessedArrest,
          status: parsed.status,
          activatedAt: parsed.activatedAt,
          outcome: parsed.outcome,
          cprCycleCount: (parsed.cprCycles ?? []).length,
          defibrillationCount: (parsed.defibrillations ?? []).length,
          drugCount: (parsed.aclsDrugs ?? []).length,
          timelineCount: (parsed.timeline ?? []).length,
          createdAt: d.createdAt,
        };
      })
      .filter((d) => (filters.status ? d.status === filters.status : true));

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
