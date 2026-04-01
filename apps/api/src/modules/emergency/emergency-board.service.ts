import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TrackingBoardQueryDto,
  DoorToMetricsDto,
  ReclassificationDto,
  FastTrackDto,
  TraumaProtocolDto,
  CardiacArrestProtocolDto,
  ChestPainProtocolDto,
  ObservationUnitDto,
  ObservationDispositionDto,
  HandoffDto,
  OvercrowdingDataDto,
  OvercrowdingAlert,
  ManchesterLevel,
  PatientBoardStatus,
} from './dto/emergency-board.dto';

// ─── Internal Interfaces ──────────────────────────────────────────────────────

export interface DoorToMetricsRecord {
  id: string;
  tenantId: string;
  patientId: string;
  doorTime: Date;
  triageTime: Date | null;
  doctorTime: Date | null;
  needleTime: Date | null;
  balloonTime: Date | null;
  antibioticTime: Date | null;
  doorToDoctorMinutes: number | null;
  doorToNeedleMinutes: number | null;
  doorToBalloonMinutes: number | null;
  doorToAntibioticMinutes: number | null;
  meetsSTEMITarget: boolean | null;   // ≤ 90 min door-to-balloon
  meetsStrokeTarget: boolean | null;  // ≤ 60 min door-to-needle
  meetsSepsisTarget: boolean | null;  // ≤ 60 min door-to-antibiotic
  authorId: string;
  createdAt: Date;
}

export interface BoardPatient {
  id: string;
  tenantId: string;
  patientId: string;
  encounterId: string | null;
  manchesterLevel: ManchesterLevel;
  status: PatientBoardStatus;
  bedId: string | null;
  responsibleDoctorId: string | null;
  chiefComplaint: string;
  doorTime: Date;
  waitMinutes: number;
  createdAt: Date;
}

export interface TraumaRecord {
  id: string;
  tenantId: string;
  patientId: string;
  encounterId: string | null;
  mechanism: string;
  iss: number | null;
  rts: number | null;
  triss: number | null;
  traumaScore: string;
  abcde: Record<string, string>;
  fastExam: Record<string, unknown>;
  activationTime: Date;
  teamLeader: string;
  createdAt: Date;
}

export interface CardiacArrestRecord {
  id: string;
  tenantId: string;
  patientId: string;
  encounterId: string | null;
  initialRhythm: string;
  collapseTime: Date;
  cprStartTime: Date;
  cprCycles: number | null;
  drugs: Array<{ drug: string; dose: string; administeredAt: string }>;
  defibrillations: Array<{ joules: number; at: string; preShockRhythm: string }>;
  airway: string;
  roscTime: Date | null;
  timeOfDeath: Date | null;
  teamLeader: string;
  cprDurationMinutes: number | null;
  outcome: string;
  createdAt: Date;
}

export interface ObservationRecord {
  id: string;
  tenantId: string;
  patientId: string;
  encounterId: string | null;
  admissionTime: Date;
  maxStayHours: number;
  reassessmentIntervalHours: number;
  deadlineTime: Date;
  criteria: string | null;
  authorId: string;
  disposition: string | null;
  dispositionJustification: string | null;
  dispositionAt: Date | null;
  isOverdue: boolean;
  createdAt: Date;
}

export interface HandoffRecord {
  id: string;
  tenantId: string;
  patientId: string;
  encounterId: string | null;
  handoffType: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  pendingTasks: string[];
  sendingClinician: string;
  receivingClinician: string;
  completedAt: Date;
  createdAt: Date;
}

export interface OvercrowdingReport {
  tenantId: string;
  currentCensus: number;
  totalCapacity: number;
  occupancyPercent: number;
  hallwayPatients: number;
  avgWaitMinutes: number;
  expectedDischarges: number;
  nedocsScore: number;
  edwinScore: number;
  alertLevel: OvercrowdingAlert;
  alertMessage: string;
  generatedAt: Date;
}

// ─── HEART Score component weights ──────────────────────────────────────────

const MANCHESTER_MAX_WAIT_MINUTES: Record<ManchesterLevel, number> = {
  [ManchesterLevel.RED]: 0,
  [ManchesterLevel.ORANGE]: 10,
  [ManchesterLevel.YELLOW]: 60,
  [ManchesterLevel.GREEN]: 120,
  [ManchesterLevel.BLUE]: 240,
};

@Injectable()
export class EmergencyBoardService {
  private readonly logger = new Logger(EmergencyBoardService.name);

  // In-memory stores
  private boardPatients: BoardPatient[] = [];
  private doorToMetrics: DoorToMetricsRecord[] = [];
  private traumaRecords: TraumaRecord[] = [];
  private cardiacArrestRecords: CardiacArrestRecord[] = [];
  private chestPainRecords: Array<{
    id: string;
    tenantId: string;
    patientId: string;
    encounterId: string | null;
    ecgTime: Date;
    ecgFindings: string | null;
    stElevation: boolean;
    troponinSerial: Array<{ value: number; unit: string; drawnAt: string }>;
    heartScore: number | null;
    timiScore: number | null;
    heartRiskCategory: string | null;
    disposition: string;
    authorId: string;
    createdAt: Date;
  }> = [];
  private observationRecords: ObservationRecord[] = [];
  private handoffRecords: HandoffRecord[] = [];
  private reclassifications: Array<{
    id: string;
    tenantId: string;
    patientId: string;
    encounterId: string | null;
    previousClassification: string;
    newClassification: string;
    reason: string;
    assessedBy: string;
    createdAt: Date;
  }> = [];
  private fastTrackRecords: Array<{
    id: string;
    tenantId: string;
    patientId: string;
    encounterId: string | null;
    eligibilityCriteria: string;
    authorId: string;
    startTime: Date;
    dispositionTime: Date | null;
    throughputMinutes: number | null;
  }> = [];

  constructor(private readonly prisma: PrismaService) {}

  private buildDocData(
    tenantId: string,
    patientId: string,
    authorId: string,
    subType: string,
    title: string,
    content: Record<string, unknown>,
    encounterId?: string,
  ) {
    return {
      tenantId,
      patientId,
      authorId,
      encounterId: encounterId ?? null,
      type: 'CUSTOM' as const,
      title: `[EMERGENCY:${subType}] ${title}`,
      content: JSON.stringify(content),
      status: 'FINAL' as const,
    };
  }

  // ─── Tracking Board ─────────────────────────────────────────────────────────

  async getTrackingBoard(tenantId: string, query: TrackingBoardQueryDto) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[EMERGENCY:' },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: {
        patient: { select: { id: true, fullName: true, mrn: true, birthDate: true } },
        author: { select: { id: true, name: true, role: true } },
      },
    });

    const now = new Date();
    const buckets: Record<string, typeof docs> = {
      waiting: [],
      inTriage: [],
      inTreatment: [],
      observation: [],
      awaitingExam: [],
      boardingOrPending: [],
    };

    for (const doc of docs) {
      let content: Record<string, unknown>;
      try { content = JSON.parse(doc.content ?? '{}') as Record<string, unknown>; } catch { content = {}; }

      const status = String(content.currentStatus ?? content.manchesterLevel ?? '');
      if (query.status && status !== query.status) continue;

      const doorTime = content.doorTime ? new Date(String(content.doorTime)) : doc.createdAt;
      const waitMinutes = Math.floor((now.getTime() - doorTime.getTime()) / 60000);
      const level = String(content.manchesterLevel ?? 'GREEN') as ManchesterLevel;
      const maxWait = MANCHESTER_MAX_WAIT_MINUTES[level] ?? 120;
      const isDelayed = waitMinutes > maxWait;

      const enriched = { ...doc, waitMinutes, isDelayed, manchesterLevel: level };

      if (status === 'WAITING') buckets.waiting.push(enriched as typeof doc);
      else if (status === 'IN_TRIAGE') buckets.inTriage.push(enriched as typeof doc);
      else if (status === 'IN_TREATMENT') buckets.inTreatment.push(enriched as typeof doc);
      else if (status === 'OBSERVATION') buckets.observation.push(enriched as typeof doc);
      else if (status === 'AWAITING_EXAM') buckets.awaitingExam.push(enriched as typeof doc);
      else buckets.boardingOrPending.push(enriched as typeof doc);
    }

    const totalWaiting = buckets.waiting.length + buckets.inTriage.length;

    return {
      generatedAt: now.toISOString(),
      totalPresent: docs.length,
      totalWaiting,
      ...buckets,
    };
  }

  // ─── Door-to-X Metrics ──────────────────────────────────────────────────────

  async recordDoorToMetrics(tenantId: string, dto: DoorToMetricsDto): Promise<DoorToMetricsRecord> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente "${dto.patientId}" não encontrado`);
    }

    const doorTime = new Date(dto.doorTime);
    const calcMinutes = (iso?: string): number | null =>
      iso ? Math.round((new Date(iso).getTime() - doorTime.getTime()) / 60000) : null;

    const doorToDoctorMinutes = calcMinutes(dto.doctorTime);
    const doorToNeedleMinutes = calcMinutes(dto.needleTime);
    const doorToBalloonMinutes = calcMinutes(dto.balloonTime);
    const doorToAntibioticMinutes = calcMinutes(dto.antibioticTime);

    const record: DoorToMetricsRecord = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      doorTime,
      triageTime: dto.triageTime ? new Date(dto.triageTime) : null,
      doctorTime: dto.doctorTime ? new Date(dto.doctorTime) : null,
      needleTime: dto.needleTime ? new Date(dto.needleTime) : null,
      balloonTime: dto.balloonTime ? new Date(dto.balloonTime) : null,
      antibioticTime: dto.antibioticTime ? new Date(dto.antibioticTime) : null,
      doorToDoctorMinutes,
      doorToNeedleMinutes,
      doorToBalloonMinutes,
      doorToAntibioticMinutes,
      meetsSTEMITarget: doorToBalloonMinutes !== null ? doorToBalloonMinutes <= 90 : null,
      meetsStrokeTarget: doorToNeedleMinutes !== null ? doorToNeedleMinutes <= 60 : null,
      meetsSepsisTarget: doorToAntibioticMinutes !== null ? doorToAntibioticMinutes <= 60 : null,
      authorId: dto.authorId,
      createdAt: new Date(),
    };

    this.doorToMetrics.push(record);

    if (record.meetsSTEMITarget === false) {
      this.logger.warn(`STEMI ALVO NÃO ATINGIDO: patient=${dto.patientId} door-to-balloon=${doorToBalloonMinutes} min (alvo ≤90)`);
    }
    if (record.meetsStrokeTarget === false) {
      this.logger.warn(`AVC ALVO NÃO ATINGIDO: patient=${dto.patientId} door-to-needle=${doorToNeedleMinutes} min (alvo ≤60)`);
    }

    return record;
  }

  async getDoorToMetrics(tenantId: string, patientId?: string): Promise<DoorToMetricsRecord[]> {
    return this.doorToMetrics
      .filter((r) => r.tenantId === tenantId && (!patientId || r.patientId === patientId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ─── Reclassification ───────────────────────────────────────────────────────

  async reclassifyPatient(tenantId: string, dto: ReclassificationDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente "${dto.patientId}" não encontrado`);
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.assessedBy,
        'RECLASSIFICATION',
        `Reclassificação: ${dto.previousClassification} → ${dto.newClassification}`,
        {
          previousClassification: dto.previousClassification,
          newClassification: dto.newClassification,
          reason: dto.reason,
          assessedBy: dto.assessedBy,
          reclassifiedAt: new Date().toISOString(),
          currentStatus: 'IN_TRIAGE',
        },
        dto.encounterId,
      ),
    });

    const record = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      previousClassification: dto.previousClassification,
      newClassification: dto.newClassification,
      reason: dto.reason,
      assessedBy: dto.assessedBy,
      createdAt: new Date(),
    };

    this.reclassifications.push(record);

    // Auto-escalate if upgrading to RED/ORANGE
    if ([ManchesterLevel.RED, ManchesterLevel.ORANGE].includes(dto.newClassification)) {
      this.logger.warn(
        `ESCALADA DE RISCO: patient=${dto.patientId} ${dto.previousClassification} → ${dto.newClassification}`,
      );
    }

    return { reclassification: record, document: doc };
  }

  // ─── Fast Track ─────────────────────────────────────────────────────────────

  async createFastTrack(tenantId: string, dto: FastTrackDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente "${dto.patientId}" não encontrado`);
    }

    const record = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      eligibilityCriteria: dto.eligibilityCriteria,
      authorId: dto.authorId,
      startTime: new Date(),
      dispositionTime: null,
      throughputMinutes: null,
    };

    this.fastTrackRecords.push(record);

    const doc = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'FAST_TRACK',
        'Fast Track — Baixa Complexidade',
        {
          eligibilityCriteria: dto.eligibilityCriteria,
          startTime: record.startTime.toISOString(),
          currentStatus: 'IN_TREATMENT',
        },
        dto.encounterId,
      ),
    });

    return { fastTrack: record, document: doc };
  }

  async closeFastTrack(tenantId: string, fastTrackId: string, _authorId: string) {
    const record = this.fastTrackRecords.find(
      (r) => r.id === fastTrackId && r.tenantId === tenantId,
    );
    if (!record) throw new NotFoundException(`Fast track "${fastTrackId}" não encontrado`);
    if (record.dispositionTime) throw new BadRequestException('Fast track já encerrado');

    record.dispositionTime = new Date();
    record.throughputMinutes = Math.round(
      (record.dispositionTime.getTime() - record.startTime.getTime()) / 60000,
    );

    return record;
  }

  // ─── Trauma Protocol (ATLS) ─────────────────────────────────────────────────

  async activateTraumaProtocol(tenantId: string, dto: TraumaProtocolDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente "${dto.patientId}" não encontrado`);
    }

    const traumaScore = this.classifyTrauma(dto.iss, dto.rts);

    const record: TraumaRecord = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      mechanism: dto.mechanism,
      iss: dto.iss ?? null,
      rts: dto.rts ?? null,
      triss: dto.triss ?? null,
      traumaScore,
      abcde: { ...dto.abcde },
      fastExam: { ...dto.fastExam },
      activationTime: new Date(dto.activationTime),
      teamLeader: dto.teamLeader,
      createdAt: new Date(),
    };

    this.traumaRecords.push(record);

    const fastPositive = Object.entries(dto.fastExam)
      .filter(([k, v]) => k !== 'notes' && v === true)
      .map(([k]) => k);

    const doc = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.teamLeader,
        'TRAUMA',
        `Código Trauma — ${traumaScore} — ${dto.mechanism}`,
        {
          mechanism: dto.mechanism,
          iss: dto.iss,
          rts: dto.rts,
          triss: dto.triss,
          traumaScore,
          abcde: dto.abcde,
          fastPositive,
          activationTime: dto.activationTime,
          currentStatus: 'IN_TREATMENT',
        },
        dto.encounterId,
      ),
    });

    return { trauma: record, document: doc };
  }

  private classifyTrauma(iss?: number, rts?: number): string {
    if (iss !== undefined) {
      if (iss >= 50) return 'CRITICAL';
      if (iss >= 25) return 'SEVERE';
      if (iss >= 9) return 'MODERATE';
      return 'MINOR';
    }
    if (rts !== undefined) {
      if (rts < 4) return 'CRITICAL';
      if (rts < 6) return 'SEVERE';
      if (rts < 7.84) return 'MODERATE';
      return 'MINOR';
    }
    return 'UNKNOWN';
  }

  // ─── Cardiac Arrest / Code Blue ─────────────────────────────────────────────

  async activateCodeBlue(tenantId: string, dto: CardiacArrestProtocolDto): Promise<CardiacArrestRecord> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente "${dto.patientId}" não encontrado`);
    }

    const cprDurationMinutes = dto.roscTime
      ? Math.round((new Date(dto.roscTime).getTime() - new Date(dto.cprStartTime).getTime()) / 60000)
      : null;

    const outcome = dto.roscTime ? 'ROSC' : dto.timeOfDeath ? 'DEATH' : 'ONGOING';

    const record: CardiacArrestRecord = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      initialRhythm: dto.initialRhythm,
      collapseTime: new Date(dto.collapseTime),
      cprStartTime: new Date(dto.cprStartTime),
      cprCycles: dto.cprCycles ?? null,
      drugs: dto.drugs,
      defibrillations: dto.defibrillations,
      airway: dto.airway,
      roscTime: dto.roscTime ? new Date(dto.roscTime) : null,
      timeOfDeath: dto.timeOfDeath ? new Date(dto.timeOfDeath) : null,
      teamLeader: dto.teamLeader,
      cprDurationMinutes,
      outcome,
      createdAt: new Date(),
    };

    this.cardiacArrestRecords.push(record);

    await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.teamLeader,
        'CODE_BLUE',
        `Código Azul — Ritmo: ${dto.initialRhythm} — Desfecho: ${outcome}`,
        {
          initialRhythm: dto.initialRhythm,
          collapseTime: dto.collapseTime,
          cprStartTime: dto.cprStartTime,
          cprCycles: dto.cprCycles,
          drugsCount: dto.drugs.length,
          defibrillationsCount: dto.defibrillations.length,
          airway: dto.airway,
          roscTime: dto.roscTime,
          timeOfDeath: dto.timeOfDeath,
          cprDurationMinutes,
          outcome,
          currentStatus: outcome === 'ONGOING' ? 'IN_TREATMENT' : 'DISCHARGED',
        },
        dto.encounterId,
      ),
    });

    return record;
  }

  // ─── Chest Pain Protocol ────────────────────────────────────────────────────

  async createChestPainProtocol(tenantId: string, dto: ChestPainProtocolDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente "${dto.patientId}" não encontrado`);
    }

    const heartRiskCategory = this.classifyHeartScore(dto.heartScore);

    const record = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      ecgTime: new Date(dto.ecgTime),
      ecgFindings: dto.ecgFindings ?? null,
      stElevation: dto.stElevation ?? false,
      troponinSerial: dto.troponinSerial,
      heartScore: dto.heartScore ?? null,
      timiScore: dto.timiScore ?? null,
      heartRiskCategory,
      disposition: dto.disposition,
      authorId: dto.authorId,
      createdAt: new Date(),
    };

    this.chestPainRecords.push(record);

    const doc = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'CHEST_PAIN',
        `Protocolo Dor Torácica — HEART ${dto.heartScore ?? '?'} — ${dto.disposition}`,
        {
          ecgTime: dto.ecgTime,
          stElevation: dto.stElevation,
          heartScore: dto.heartScore,
          heartRiskCategory,
          timiScore: dto.timiScore,
          troponinCount: dto.troponinSerial.length,
          disposition: dto.disposition,
          currentStatus: dto.stElevation ? 'IN_TREATMENT' : 'AWAITING_EXAM',
        },
        dto.encounterId,
      ),
    });

    return { chestPain: record, document: doc };
  }

  private classifyHeartScore(score?: number): string {
    if (score === undefined) return 'UNKNOWN';
    if (score <= 3) return 'LOW_RISK';
    if (score <= 6) return 'INTERMEDIATE_RISK';
    return 'HIGH_RISK';
  }

  // ─── Observation Unit ────────────────────────────────────────────────────────

  async admitToObservation(tenantId: string, dto: ObservationUnitDto): Promise<ObservationRecord> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente "${dto.patientId}" não encontrado`);
    }

    const admissionTime = new Date(dto.admissionTime);
    const deadlineTime = new Date(admissionTime.getTime() + dto.maxStayHours * 60 * 60 * 1000);

    const record: ObservationRecord = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      admissionTime,
      maxStayHours: dto.maxStayHours,
      reassessmentIntervalHours: dto.reassessmentIntervalHours,
      deadlineTime,
      criteria: dto.criteria ?? null,
      authorId: dto.authorId,
      disposition: null,
      dispositionJustification: null,
      dispositionAt: null,
      isOverdue: false,
      createdAt: new Date(),
    };

    this.observationRecords.push(record);

    await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'OBSERVATION',
        `Observação — max ${dto.maxStayHours}h — reavaliação a cada ${dto.reassessmentIntervalHours}h`,
        {
          admissionTime: dto.admissionTime,
          maxStayHours: dto.maxStayHours,
          reassessmentIntervalHours: dto.reassessmentIntervalHours,
          deadlineTime: deadlineTime.toISOString(),
          criteria: dto.criteria,
          currentStatus: 'OBSERVATION',
        },
        dto.encounterId,
      ),
    });

    return record;
  }

  async recordObservationDisposition(
    tenantId: string,
    dto: ObservationDispositionDto,
  ): Promise<ObservationRecord> {
    const record = this.observationRecords.find(
      (r) => r.id === dto.observationId && r.tenantId === tenantId,
    );
    if (!record) {
      throw new NotFoundException(`Registro de observação "${dto.observationId}" não encontrado`);
    }
    if (record.disposition) {
      throw new BadRequestException('Decisão de disposição já registrada');
    }

    record.disposition = dto.decision;
    record.dispositionJustification = dto.justification;
    record.dispositionAt = new Date();

    const stayMinutes = Math.round(
      (record.dispositionAt.getTime() - record.admissionTime.getTime()) / 60000,
    );
    record.isOverdue = stayMinutes > record.maxStayHours * 60;

    return record;
  }

  async getOverdueObservations(tenantId: string): Promise<ObservationRecord[]> {
    const now = new Date();
    return this.observationRecords
      .filter(
        (r) =>
          r.tenantId === tenantId &&
          r.disposition === null &&
          r.deadlineTime < now,
      )
      .map((r) => {
        r.isOverdue = true;
        return r;
      });
  }

  // ─── Handoff (SBAR) ──────────────────────────────────────────────────────────

  async createHandoff(tenantId: string, dto: HandoffDto): Promise<HandoffRecord> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Paciente "${dto.patientId}" não encontrado`);
    }

    const record: HandoffRecord = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      encounterId: dto.encounterId ?? null,
      handoffType: dto.handoffType,
      situation: dto.situation,
      background: dto.background,
      assessment: dto.assessment,
      recommendation: dto.recommendation,
      pendingTasks: dto.pendingTasks ?? [],
      sendingClinician: dto.sendingClinician,
      receivingClinician: dto.receivingClinician,
      completedAt: new Date(),
      createdAt: new Date(),
    };

    this.handoffRecords.push(record);

    await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.sendingClinician,
        'HANDOFF',
        `Passagem de Plantão SBAR — ${dto.handoffType}`,
        {
          handoffType: dto.handoffType,
          situation: dto.situation,
          background: dto.background,
          assessment: dto.assessment,
          recommendation: dto.recommendation,
          pendingTasks: dto.pendingTasks,
          sendingClinician: dto.sendingClinician,
          receivingClinician: dto.receivingClinician,
        },
        dto.encounterId,
      ),
    });

    return record;
  }

  async getHandoffsByPatient(tenantId: string, patientId: string): Promise<HandoffRecord[]> {
    return this.handoffRecords
      .filter((r) => r.tenantId === tenantId && r.patientId === patientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ─── Overcrowding Dashboard ──────────────────────────────────────────────────

  async calculateOvercrowding(tenantId: string, dto: OvercrowdingDataDto): Promise<OvercrowdingReport> {
    const occupancyPercent = Math.round((dto.currentCensus / dto.totalCapacity) * 100);

    // Simplified NEDOCS score (National Emergency Department Overcrowding Scale)
    // Full formula: 85.8 * (census/capacity) + 600 * (hallway/beds) - 1.53 * (expected_discharges) + 18.5
    const hallwayPatients = dto.hallwayPatients ?? 0;
    const expectedDischarges = dto.expectedDischarges ?? 0;
    const nedocsScore = Math.round(
      85.8 * (dto.currentCensus / dto.totalCapacity) +
        600 * (hallwayPatients / dto.totalCapacity) -
        1.53 * expectedDischarges +
        18.5,
    );

    // EDWIN score (Emergency Ward Index)
    const avgWaitMinutes = dto.avgWaitMinutes ?? 0;
    const edwinScore = Math.round(
      (dto.currentCensus / dto.totalCapacity) * 100 + avgWaitMinutes * 0.5,
    );

    let alertLevel: OvercrowdingAlert;
    let alertMessage: string;

    if (nedocsScore <= 60) {
      alertLevel = OvercrowdingAlert.GREEN;
      alertMessage = 'PS operando normalmente';
    } else if (nedocsScore <= 100) {
      alertLevel = OvercrowdingAlert.YELLOW;
      alertMessage = 'Atenção: PS em capacidade elevada — monitorar fluxo';
    } else if (nedocsScore <= 140) {
      alertLevel = OvercrowdingAlert.ORANGE;
      alertMessage = 'ALERTA: PS superlotado — acionar protocolo de desvio';
    } else {
      alertLevel = OvercrowdingAlert.RED;
      alertMessage = 'CRÍTICO: PS em colapso — acionar direção hospitalar e Samu';
    }

    return {
      tenantId,
      currentCensus: dto.currentCensus,
      totalCapacity: dto.totalCapacity,
      occupancyPercent,
      hallwayPatients,
      avgWaitMinutes,
      expectedDischarges,
      nedocsScore,
      edwinScore,
      alertLevel,
      alertMessage,
      generatedAt: new Date(),
    };
  }
}
