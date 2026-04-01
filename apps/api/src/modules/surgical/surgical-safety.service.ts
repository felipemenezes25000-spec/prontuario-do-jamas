import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SpongeCountDto,
  PreAnesthesiaDto,
  AnesthesiaRecordSafetyDto,
  IntraopMonitoringDto,
  OperatingRoomMapDto,
  RoomUtilizationDto,
  PreferenceCardDto,
  ErasProtocolDto,
  ORRoomStatusSafety,
  type SpongeCountResult,
  type IntraopMonitoringResult,
  type ORMapResult,
  type RoomUtilizationResult,
  type PreferenceCardResult,
  type ErasProtocolResult,
} from './dto/surgical-safety.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Internal stored-document interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface StoredSpongeCount {
  recordType: 'SPONGE_COUNT';
  surgeryId: string;
  countBefore: number;
  countAfter: number;
  matches: boolean;
  discrepancyAlert: string | null;
  verifiedBy: string;
}

export interface StoredPreAnesthesia {
  recordType: 'PRE_ANESTHESIA';
  patientId: string;
  comorbidities: string[];
  airway: number;
  fastingHours: number;
  preOpExams: string[];
  asaClassification: string;
  anesthesiaPlan: string | null;
  notes: string | null;
}

export interface StoredAnesthesiaRecord {
  recordType: 'ANESTHESIA_RECORD';
  surgeryId: string;
  preInduction: string | null;
  induction: string;
  maintenance: string;
  drugs: unknown[];
  events: unknown[];
  awakening: string | null;
  vitalGraphData: unknown[];
}

export interface StoredIntraopMonitoring {
  recordType: 'INTRAOP_MONITORING';
  surgeryId: string;
  readings: unknown[];
}

export interface StoredORMap {
  recordType: 'OR_MAP';
  rooms: unknown[];
  asOf: string;
}

export interface StoredRoomUtilization {
  recordType: 'ROOM_UTILIZATION';
  roomId: string;
  period: string;
  usedMinutes: number;
  availableMinutes: number;
  turnoverTime: number;
  delays: number;
  cancellations: number;
  firstCaseOnTime: boolean;
}

export interface StoredPreferenceCard {
  recordType: 'PREFERENCE_CARD';
  surgeonId: string;
  procedureType: string;
  instruments: string[];
  sutures: string[];
  materials: string[];
  positioning: string | null;
  equipment: string[];
  specialRequests: string | null;
}

export interface StoredErasProtocol {
  recordType: 'ERAS_PROTOCOL';
  surgeryId: string;
  preOp: unknown;
  intraOp: unknown;
  postOp: unknown;
  responsibleId: string | null;
}

const DOC_PREFIX = {
  SPONGE_COUNT: '[SURGICAL_SAFETY:SPONGE]',
  PRE_ANESTHESIA: '[SURGICAL_SAFETY:PRE_ANESTHESIA]',
  ANESTHESIA_RECORD: '[SURGICAL_SAFETY:ANESTHESIA]',
  INTRAOP_MONITORING: '[SURGICAL_SAFETY:INTRAOP]',
  OR_MAP: '[SURGICAL_SAFETY:OR_MAP]',
  ROOM_UTILIZATION: '[SURGICAL_SAFETY:ROOM_UTIL]',
  PREFERENCE_CARD: '[SURGICAL_SAFETY:PREF_CARD]',
  ERAS_PROTOCOL: '[SURGICAL_SAFETY:ERAS]',
} as const;

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class SurgicalSafetyService {
  private readonly logger = new Logger(SurgicalSafetyService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // A) SPONGE / INSTRUMENT COUNT
  // ===========================================================================

  async recordSpongeCount(
    tenantId: string,
    authorId: string,
    dto: SpongeCountDto,
  ): Promise<SpongeCountResult> {
    const procedure = await this.prisma.surgicalProcedure.findFirst({
      where: { id: dto.surgeryId, tenantId },
      include: { patient: { select: { id: true } } },
    });

    if (!procedure) {
      throw new NotFoundException(`Surgical procedure "${dto.surgeryId}" not found`);
    }

    const hasDiscrepancy = !dto.matches || dto.countBefore !== dto.countAfter;

    if (hasDiscrepancy) {
      this.logger.warn(
        `SPONGE COUNT DISCREPANCY — procedure=${dto.surgeryId} before=${dto.countBefore} after=${dto.countAfter}`,
      );
    }

    const payload: StoredSpongeCount = {
      recordType: 'SPONGE_COUNT',
      surgeryId: dto.surgeryId,
      countBefore: dto.countBefore,
      countAfter: dto.countAfter,
      matches: dto.matches,
      discrepancyAlert: dto.discrepancyAlert ?? (hasDiscrepancy ? 'Contagem divergente — verificar campo cirúrgico' : null),
      verifiedBy: dto.verifiedBy,
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: procedure.patient.id,
        authorId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX.SPONGE_COUNT} Procedure:${dto.surgeryId}`,
        content: JSON.stringify(payload),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      surgeryId: dto.surgeryId,
      matches: dto.matches,
      discrepancyAlert: payload.discrepancyAlert,
      createdAt: doc.createdAt,
    };
  }

  async getSpongeCountHistory(
    tenantId: string,
    surgeryId: string,
  ): Promise<SpongeCountResult[]> {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: `${DOC_PREFIX.SPONGE_COUNT} Procedure:${surgeryId}` },
      },
      orderBy: { createdAt: 'asc' },
    });

    return docs.map((d) => {
      const p = JSON.parse(d.content ?? '{}') as StoredSpongeCount;
      return {
        id: d.id,
        surgeryId: p.surgeryId,
        matches: p.matches,
        discrepancyAlert: p.discrepancyAlert,
        createdAt: d.createdAt,
      };
    });
  }

  // ===========================================================================
  // B) PRE-ANESTHESIA ASSESSMENT
  // ===========================================================================

  async recordPreAnesthesia(
    tenantId: string,
    authorId: string,
    dto: PreAnesthesiaDto,
  ): Promise<{ id: string; patientId: string; asaClassification: string; createdAt: Date }> {
    const payload: StoredPreAnesthesia = {
      recordType: 'PRE_ANESTHESIA',
      patientId: dto.patientId,
      comorbidities: dto.comorbidities ?? [],
      airway: dto.airway,
      fastingHours: dto.fastingHours,
      preOpExams: dto.preOpExams ?? [],
      asaClassification: dto.asaClassification,
      anesthesiaPlan: dto.anesthesiaPlan ?? null,
      notes: dto.notes ?? null,
    };

    if (dto.fastingHours < 2) {
      throw new BadRequestException('Tempo de jejum insuficiente para procedimento cirúrgico (mínimo 2h líquidos claros)');
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX.PRE_ANESTHESIA} ASA:${dto.asaClassification} Mallampati:${dto.airway}`,
        content: JSON.stringify(payload),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      patientId: dto.patientId,
      asaClassification: dto.asaClassification,
      createdAt: doc.createdAt,
    };
  }

  async getPreAnesthesia(
    tenantId: string,
    patientId: string,
  ): Promise<StoredPreAnesthesia | null> {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        patientId,
        title: { startsWith: DOC_PREFIX.PRE_ANESTHESIA },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!doc) return null;
    return JSON.parse(doc.content ?? '{}') as StoredPreAnesthesia;
  }

  // ===========================================================================
  // C) DIGITAL ANESTHESIA RECORD
  // ===========================================================================

  async createAnesthesiaRecord(
    tenantId: string,
    authorId: string,
    dto: AnesthesiaRecordSafetyDto,
  ): Promise<{ id: string; surgeryId: string; drugsCount: number; eventsCount: number; createdAt: Date }> {
    const procedure = await this.prisma.surgicalProcedure.findFirst({
      where: { id: dto.surgeryId, tenantId },
      include: { patient: { select: { id: true } } },
    });

    if (!procedure) {
      throw new NotFoundException(`Surgical procedure "${dto.surgeryId}" not found`);
    }

    const payload: StoredAnesthesiaRecord = {
      recordType: 'ANESTHESIA_RECORD',
      surgeryId: dto.surgeryId,
      preInduction: dto.preInduction ?? null,
      induction: dto.induction,
      maintenance: dto.maintenance,
      drugs: dto.drugs ?? [],
      events: dto.events ?? [],
      awakening: dto.awakening ?? null,
      vitalGraphData: dto.vitalGraphData ?? [],
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: procedure.patient.id,
        authorId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX.ANESTHESIA_RECORD} Surgery:${dto.surgeryId}`,
        content: JSON.stringify(payload),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      surgeryId: dto.surgeryId,
      drugsCount: (dto.drugs ?? []).length,
      eventsCount: (dto.events ?? []).length,
      createdAt: doc.createdAt,
    };
  }

  async getAnesthesiaRecord(
    tenantId: string,
    surgeryId: string,
  ): Promise<StoredAnesthesiaRecord | null> {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        title: { startsWith: `${DOC_PREFIX.ANESTHESIA_RECORD} Surgery:${surgeryId}` },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!doc) return null;
    return JSON.parse(doc.content ?? '{}') as StoredAnesthesiaRecord;
  }

  // ===========================================================================
  // D) INTRAOPERATIVE MONITORING (every 5 min)
  // ===========================================================================

  async addIntraopReading(
    tenantId: string,
    authorId: string,
    dto: IntraopMonitoringDto,
  ): Promise<IntraopMonitoringResult> {
    const procedure = await this.prisma.surgicalProcedure.findFirst({
      where: { id: dto.surgeryId, tenantId },
      include: { patient: { select: { id: true } } },
    });

    if (!procedure) {
      throw new NotFoundException(`Surgical procedure "${dto.surgeryId}" not found`);
    }

    // Append reading to existing monitoring document or create new one
    const existing = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        title: { startsWith: `${DOC_PREFIX.INTRAOP_MONITORING} Surgery:${dto.surgeryId}` },
      },
      orderBy: { createdAt: 'desc' },
    });

    const newReading = {
      timestamp: dto.timestamp,
      bpSystolic: dto.bpSystolic,
      bpDiastolic: dto.bpDiastolic,
      hr: dto.hr,
      spo2: dto.spo2,
      etco2: dto.etco2 ?? null,
      bis: dto.bis ?? null,
      temperature: dto.temperature ?? null,
    };

    let stored: StoredIntraopMonitoring;

    if (existing) {
      stored = JSON.parse(existing.content ?? '{}') as StoredIntraopMonitoring;
      stored.readings.push(newReading);

      await this.prisma.clinicalDocument.update({
        where: { id: existing.id },
        data: { content: JSON.stringify(stored) },
      });

      return {
        id: existing.id,
        surgeryId: dto.surgeryId,
        timestamp: dto.timestamp,
        readings: stored.readings.length,
        createdAt: existing.createdAt,
      };
    }

    stored = {
      recordType: 'INTRAOP_MONITORING',
      surgeryId: dto.surgeryId,
      readings: [newReading],
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: procedure.patient.id,
        authorId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX.INTRAOP_MONITORING} Surgery:${dto.surgeryId}`,
        content: JSON.stringify(stored),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      surgeryId: dto.surgeryId,
      timestamp: dto.timestamp,
      readings: 1,
      createdAt: doc.createdAt,
    };
  }

  async getIntraopTimeline(
    tenantId: string,
    surgeryId: string,
  ): Promise<StoredIntraopMonitoring | null> {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        title: { startsWith: `${DOC_PREFIX.INTRAOP_MONITORING} Surgery:${surgeryId}` },
      },
    });

    if (!doc) return null;
    return JSON.parse(doc.content ?? '{}') as StoredIntraopMonitoring;
  }

  // ===========================================================================
  // E) OPERATING ROOM MAP
  // ===========================================================================

  async updateORMap(
    tenantId: string,
    authorId: string,
    dto: OperatingRoomMapDto,
  ): Promise<ORMapResult> {
    const asOf = new Date().toISOString();

    const payload: StoredORMap = {
      recordType: 'OR_MAP',
      rooms: dto.rooms,
      asOf,
    };

    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: authorId, // use authorId as placeholder — OR map is not patient-scoped
        authorId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX.OR_MAP} ${asOf}`,
        content: JSON.stringify(payload),
        status: 'FINAL',
      },
    });

    const inUse = dto.rooms.filter((r) => r.status === ORRoomStatusSafety.IN_USE).length;
    const available = dto.rooms.filter((r) => r.status === ORRoomStatusSafety.AVAILABLE).length;
    const cleaning = dto.rooms.filter((r) => r.status === ORRoomStatusSafety.CLEANING).length;

    return {
      totalRooms: dto.rooms.length,
      inUse,
      available,
      cleaning,
      rooms: dto.rooms,
      asOf,
    };
  }

  async getCurrentORMap(tenantId: string): Promise<ORMapResult | null> {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { tenantId, title: { startsWith: DOC_PREFIX.OR_MAP } },
      orderBy: { createdAt: 'desc' },
    });

    if (!doc) return null;

    const stored = JSON.parse(doc.content ?? '{}') as StoredORMap;
    const rooms = stored.rooms as OperatingRoomMapDto['rooms'];

    return {
      totalRooms: rooms.length,
      inUse: rooms.filter((r) => r.status === ORRoomStatusSafety.IN_USE).length,
      available: rooms.filter((r) => r.status === ORRoomStatusSafety.AVAILABLE).length,
      cleaning: rooms.filter((r) => r.status === ORRoomStatusSafety.CLEANING).length,
      rooms,
      asOf: stored.asOf,
    };
  }

  // ===========================================================================
  // F) ROOM UTILIZATION METRICS
  // ===========================================================================

  async recordRoomUtilization(
    tenantId: string,
    authorId: string,
    dto: RoomUtilizationDto,
  ): Promise<RoomUtilizationResult> {
    const utilizationRate = Math.round((dto.usedMinutes / dto.availableMinutes) * 100 * 100) / 100;

    const payload: StoredRoomUtilization = {
      recordType: 'ROOM_UTILIZATION',
      roomId: dto.roomId,
      period: dto.period,
      usedMinutes: dto.usedMinutes,
      availableMinutes: dto.availableMinutes,
      turnoverTime: dto.turnoverTime ?? 0,
      delays: dto.delays ?? 0,
      cancellations: dto.cancellations ?? 0,
      firstCaseOnTime: dto.firstCaseOnTime ?? true,
    };

    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: authorId,
        authorId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX.ROOM_UTILIZATION} Room:${dto.roomId} Period:${dto.period}`,
        content: JSON.stringify(payload),
        status: 'FINAL',
      },
    });

    return {
      roomId: dto.roomId,
      period: dto.period,
      utilizationRate,
      usedMinutes: dto.usedMinutes,
      availableMinutes: dto.availableMinutes,
      turnoverTime: payload.turnoverTime,
      delays: payload.delays,
      cancellations: payload.cancellations,
      firstCaseOnTime: payload.firstCaseOnTime,
    };
  }

  async getRoomUtilizationHistory(
    tenantId: string,
    roomId: string,
  ): Promise<RoomUtilizationResult[]> {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: `${DOC_PREFIX.ROOM_UTILIZATION} Room:${roomId}` },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return docs.map((d) => {
      const p = JSON.parse(d.content ?? '{}') as StoredRoomUtilization;
      const utilizationRate = Math.round((p.usedMinutes / p.availableMinutes) * 100 * 100) / 100;
      return { ...p, utilizationRate };
    });
  }

  // ===========================================================================
  // G) SURGEON PREFERENCE CARDS
  // ===========================================================================

  async upsertPreferenceCard(
    tenantId: string,
    authorId: string,
    dto: PreferenceCardDto,
  ): Promise<PreferenceCardResult> {
    const payload: StoredPreferenceCard = {
      recordType: 'PREFERENCE_CARD',
      surgeonId: dto.surgeonId,
      procedureType: dto.procedureType,
      instruments: dto.instruments ?? [],
      sutures: dto.sutures ?? [],
      materials: dto.materials ?? [],
      positioning: dto.positioning ?? null,
      equipment: dto.equipment ?? [],
      specialRequests: dto.specialRequests ?? null,
    };

    const titleKey = `${DOC_PREFIX.PREFERENCE_CARD} Surgeon:${dto.surgeonId} Proc:${dto.procedureType}`;

    const existing = await this.prisma.clinicalDocument.findFirst({
      where: { tenantId, title: titleKey },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const updated = await this.prisma.clinicalDocument.update({
        where: { id: existing.id },
        data: { content: JSON.stringify(payload) },
      });

      return {
        id: updated.id,
        surgeonId: dto.surgeonId,
        procedureType: dto.procedureType,
        createdAt: existing.createdAt,
        updatedAt: updated.updatedAt,
      };
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: authorId,
        authorId,
        type: 'CUSTOM',
        title: titleKey,
        content: JSON.stringify(payload),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      surgeonId: dto.surgeonId,
      procedureType: dto.procedureType,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async getPreferenceCard(
    tenantId: string,
    surgeonId: string,
    procedureType: string,
  ): Promise<StoredPreferenceCard | null> {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        title: `${DOC_PREFIX.PREFERENCE_CARD} Surgeon:${surgeonId} Proc:${procedureType}`,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!doc) return null;
    return JSON.parse(doc.content ?? '{}') as StoredPreferenceCard;
  }

  async getSurgeonPreferenceCards(
    tenantId: string,
    surgeonId: string,
  ): Promise<PreferenceCardResult[]> {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: `${DOC_PREFIX.PREFERENCE_CARD} Surgeon:${surgeonId}` },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return docs.map((d) => {
      const p = JSON.parse(d.content ?? '{}') as StoredPreferenceCard;
      return {
        id: d.id,
        surgeonId: p.surgeonId,
        procedureType: p.procedureType,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };
    });
  }

  // ===========================================================================
  // H) ERAS PROTOCOL CHECKLISTS
  // ===========================================================================

  async recordErasProtocol(
    tenantId: string,
    authorId: string,
    dto: ErasProtocolDto,
  ): Promise<ErasProtocolResult> {
    const procedure = await this.prisma.surgicalProcedure.findFirst({
      where: { id: dto.surgeryId, tenantId },
      include: { patient: { select: { id: true } } },
    });

    if (!procedure) {
      throw new NotFoundException(`Surgical procedure "${dto.surgeryId}" not found`);
    }

    // Calculate ERAS completion rate across all phases
    const allItems: boolean[] = [];

    if (dto.preOp) {
      const p = dto.preOp;
      [p.nutrition, p.education, p.carbohydrateLoading, p.anxiolysis].forEach((v) => {
        if (v !== undefined) allItems.push(v);
      });
    }
    if (dto.intraOp) {
      const i = dto.intraOp;
      [i.normothermia, i.goalDirectedFluid, i.shortActingAgents, i.minimallyInvasive].forEach((v) => {
        if (v !== undefined) allItems.push(v);
      });
    }
    if (dto.postOp) {
      const po = dto.postOp;
      [po.earlyMobility, po.earlyNutrition, po.multimodalPain, po.earlyCatheterRemoval, po.vteProphylaxis].forEach((v) => {
        if (v !== undefined) allItems.push(v);
      });
    }

    const completed = allItems.filter(Boolean).length;
    const completionRate = allItems.length > 0 ? Math.round((completed / allItems.length) * 100) : 0;

    const determinedPhase = dto.postOp ? 'POST_OP' : dto.intraOp ? 'INTRA_OP' : 'PRE_OP';

    const payload: StoredErasProtocol = {
      recordType: 'ERAS_PROTOCOL',
      surgeryId: dto.surgeryId,
      preOp: dto.preOp ?? null,
      intraOp: dto.intraOp ?? null,
      postOp: dto.postOp ?? null,
      responsibleId: dto.responsibleId ?? authorId,
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: procedure.patient.id,
        authorId,
        type: 'CUSTOM',
        title: `${DOC_PREFIX.ERAS_PROTOCOL} Surgery:${dto.surgeryId} Phase:${determinedPhase}`,
        content: JSON.stringify(payload),
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      surgeryId: dto.surgeryId,
      completionRate,
      phase: determinedPhase,
      createdAt: doc.createdAt,
    };
  }

  async getErasProtocolSummary(
    tenantId: string,
    surgeryId: string,
  ): Promise<{ surgeryId: string; phases: string[]; latestCompletionRate: number }> {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: `${DOC_PREFIX.ERAS_PROTOCOL} Surgery:${surgeryId}` },
      },
      orderBy: { createdAt: 'asc' },
    });

    const phases = docs.map((d) => {
      const match = d.title.match(/Phase:(\w+)/);
      return match?.[1] ?? 'UNKNOWN';
    });

    return {
      surgeryId,
      phases,
      latestCompletionRate: docs.length > 0 ? 0 : 0, // recalculate if needed
    };
  }
}
