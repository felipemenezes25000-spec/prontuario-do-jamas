import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTriageDto, UpdateEmergencyStatusDto, ActivateProtocolDto } from './dto/create-triage.dto';
import { ReclassifyRiskDto, CalculateNedocsDto } from './dto/emergency-advanced.dto';
import {
  DateRangeDto,
  ManageQueueDto,
  CreateFastTrackDto,
  ActivateCodeStrokeDto,
  ActivateCodeSTEMIDto,
  ActivateCodeSepsisDto,
  ActivateCodeTraumaDto,
  ActivateCodeBlueDto,
  CreateChestPainProtocolDto,
  CreateObservationUnitDto,
  CreateEmergencyHandoffDto,
  QueueAction,
} from './dto/emergency-protocols.dto';

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger(EmergencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  private buildDocData(tenantId: string, patientId: string, authorId: string, subType: string, title: string, content: Record<string, unknown>, encounterId?: string) {
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

  async createTriage(tenantId: string, dto: CreateTriageDto) {
    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'TRIAGE',
        `Triagem Manchester - ${dto.manchesterLevel}`,
        {
          manchesterLevel: dto.manchesterLevel,
          chiefComplaint: dto.chiefComplaint,
          painScale: dto.painScale,
          vitalSigns: dto.vitalSigns,
          notes: dto.notes,
          doorTime: dto.doorTime ?? new Date().toISOString(),
          triageTime: new Date().toISOString(),
        },
        dto.encounterId,
      ),
    });
  }

  async getBoard(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[EMERGENCY:' },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        author: { select: { id: true, name: true, role: true } },
      },
    });

    const board = { waiting: [] as typeof docs, inTreatment: [] as typeof docs, observation: [] as typeof docs, other: [] as typeof docs };

    for (const doc of docs) {
      const content = this.parseContent(doc.content);
      const status = content.currentStatus ?? content.manchesterLevel;
      if (status === 'WAITING' || status === 'IN_TRIAGE') board.waiting.push(doc);
      else if (status === 'IN_TREATMENT') board.inTreatment.push(doc);
      else if (status === 'OBSERVATION') board.observation.push(doc);
      else board.other.push(doc);
    }

    return board;
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateEmergencyStatusDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId, title: { startsWith: '[EMERGENCY:' } },
    });
    if (!doc) throw new NotFoundException(`Emergency record "${id}" not found`);

    const content = this.parseContent(doc.content);
    content.currentStatus = dto.status;
    const history = Array.isArray(content.statusHistory) ? content.statusHistory : [];
    history.push({ status: dto.status, notes: dto.notes, location: dto.location, at: new Date().toISOString() });
    content.statusHistory = history;

    return this.prisma.clinicalDocument.update({
      where: { id },
      data: { content: JSON.stringify(content) },
    });
  }

  async getMetrics(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[EMERGENCY:' },
        createdAt: { gte: today },
      },
    });

    let totalWaitMinutes = 0;
    let triageCount = 0;

    for (const doc of docs) {
      const content = this.parseContent(doc.content);
      if (content.doorTime && content.triageTime) {
        const wait = (new Date(String(content.triageTime)).getTime() - new Date(String(content.doorTime)).getTime()) / 60000;
        totalWaitMinutes += wait;
        triageCount++;
      }
    }

    return {
      totalPatients: docs.length,
      averageWaitMinutes: triageCount > 0 ? Math.round(totalWaitMinutes / triageCount) : 0,
      triageCount,
      date: today.toISOString(),
    };
  }

  async activateProtocol(tenantId: string, id: string, dto: ActivateProtocolDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id, tenantId, title: { startsWith: '[EMERGENCY:' } },
    });
    if (!doc) throw new NotFoundException(`Emergency record "${id}" not found`);

    return this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'PROTOCOL',
        `Protocolo ${dto.protocolType} ativado`,
        {
          protocolType: dto.protocolType,
          parentEmergencyId: id,
          protocolData: dto.protocolData,
          notes: dto.notes,
          activatedAt: new Date().toISOString(),
        },
      ),
    });
  }

  // ─── Reclassificação de Risco ──────────────────────────────────────────────

  async reclassifyRisk(tenantId: string, encounterId: string, dto: ReclassifyRiskDto) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: encounterId, tenantId, title: { startsWith: '[EMERGENCY:' } },
    });
    if (!doc) throw new NotFoundException(`Emergency record "${encounterId}" not found`);

    const content = this.parseContent(doc.content);
    const previousLevel = content.manchesterLevel as string;

    const reclassHistory = Array.isArray(content.reclassHistory) ? content.reclassHistory : [];
    reclassHistory.push({
      previousLevel,
      newLevel: dto.newManchesterLevel,
      justification: dto.justification,
      authorId: dto.authorId,
      at: new Date().toISOString(),
    });

    content.manchesterLevel = dto.newManchesterLevel;
    content.reclassHistory = reclassHistory;
    if (dto.chiefComplaint) content.chiefComplaint = dto.chiefComplaint;
    if (dto.painScale) content.painScale = dto.painScale;

    const updated = await this.prisma.clinicalDocument.update({
      where: { id: encounterId },
      data: { content: JSON.stringify(content) },
    });

    return {
      id: updated.id,
      previousLevel,
      newLevel: dto.newManchesterLevel,
      reclassHistory,
    };
  }

  // ─── Fast Track ────────────────────────────────────────────────────────────

  async assignFastTrack(tenantId: string, encounterId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: encounterId, tenantId, title: { startsWith: '[EMERGENCY:' } },
    });
    if (!doc) throw new NotFoundException(`Emergency record "${encounterId}" not found`);

    const content = this.parseContent(doc.content);
    const manchesterLevel = content.manchesterLevel as string;

    const fastTrackEligible = ['GREEN', 'BLUE'].includes(manchesterLevel);

    const updated = await this.prisma.clinicalDocument.update({
      where: { id: encounterId },
      data: {
        content: JSON.stringify({
          ...content,
          fastTrack: true,
          fastTrackAssignedAt: new Date().toISOString(),
          fastTrackEligible,
        }),
      },
    });

    return {
      id: updated.id,
      fastTrack: true,
      eligible: fastTrackEligible,
      manchesterLevel,
      message: fastTrackEligible
        ? 'Paciente encaminhado para Fast Track'
        : `Nível Manchester ${manchesterLevel} não elegível para Fast Track — verificar com médico`,
    };
  }

  // ─── NEDOCS ────────────────────────────────────────────────────────────────

  async calculateNedocs(tenantId: string, dto: CalculateNedocsDto) {
    // NEDOCS formula: N = −20 + 0.93(P/B) + 0.93(A/B) + 19.5(V/B) + 0.00634(L × W) + 0.00594(R × W)
    // Where: P = total ED patients, B = total ED beds, A = admitted waiting bed,
    //        V = on ventilator, L = longest wait (hours), W = total ED patients, R = admissions last hour
    const P = dto.totalEdPatients;
    const B = dto.totalEdBeds;
    const A = dto.admittedWaitingBed;
    const V = dto.ventilatorsInUse;
    const L = dto.longestWaitHours;
    const W = dto.totalEdPatients;
    const R = dto.admissionsLastHour;

    const nedocsScore = Math.round(
      (-20 + 0.93 * (P / B) + 0.93 * (A / B) + 19.5 * (V / B) + 0.00634 * (L * W) + 0.00594 * (R * W)) * 10,
    ) / 10;

    let level: string;
    let recommendation: string;
    if (nedocsScore <= 20) { level = 'NOT_BUSY'; recommendation = 'Pronto-socorro não congestionado'; }
    else if (nedocsScore <= 60) { level = 'BUSY'; recommendation = 'Pronto-socorro movimentado — monitorar'; }
    else if (nedocsScore <= 100) { level = 'EXTREMELY_BUSY'; recommendation = 'Pronto-socorro muito movimentado — ativar plano de contingência'; }
    else { level = 'OVERCROWDED'; recommendation = 'SUPERLOTAÇÃO CRÍTICA — acionar plano de crise imediatamente'; }

    const record = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        'SYSTEM',
        'SYSTEM',
        'NEDOCS',
        `NEDOCS Score: ${nedocsScore} — ${level}`,
        { ...dto, nedocsScore, level, recommendation, calculatedAt: new Date().toISOString() },
      ),
    });

    return { id: record.id, nedocsScore, level, recommendation, inputs: dto };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENHANCED EMERGENCY FEATURES
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Tracking Board ────────────────────────────────────────────────────────

  async getTrackingBoard(tenantId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[EMERGENCY:' },
        status: { not: 'VOIDED' },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        author: { select: { id: true, name: true, role: true } },
      },
    });

    const columns: Record<string, typeof docs> = {
      waiting: [],
      triage: [],
      treatment: [],
      observation: [],
      discharge: [],
    };

    const patientLatest = new Map<string, typeof docs[0]>();

    for (const doc of docs) {
      // Only keep latest doc per patient
      if (!patientLatest.has(doc.patientId)) {
        patientLatest.set(doc.patientId, doc);
      }
    }

    for (const doc of patientLatest.values()) {
      const content = this.parseContent(doc.content);
      const status = (content.currentStatus as string) ?? 'WAITING';
      const manchester = content.manchesterLevel as string;
      const doorTime = content.doorTime as string;
      const waitMinutes = doorTime
        ? Math.round((Date.now() - new Date(doorTime).getTime()) / 60000)
        : null;

      const _enrichedDoc = { ...doc, _parsed: { ...content, waitMinutes, manchesterLevel: manchester } };

      switch (status) {
        case 'WAITING':
        case 'IN_TRIAGE':
          columns[status === 'IN_TRIAGE' ? 'triage' : 'waiting'].push(doc);
          break;
        case 'IN_TREATMENT':
          columns.treatment.push(doc);
          break;
        case 'OBSERVATION':
          columns.observation.push(doc);
          break;
        case 'DISCHARGED':
        case 'ADMITTED':
        case 'TRANSFERRED':
          columns.discharge.push(doc);
          break;
        default:
          columns.waiting.push(doc);
      }
    }

    const totalPatients = patientLatest.size;
    const manchesterDistribution: Record<string, number> = {};
    for (const doc of patientLatest.values()) {
      const content = this.parseContent(doc.content);
      const level = (content.manchesterLevel as string) ?? 'UNKNOWN';
      manchesterDistribution[level] = (manchesterDistribution[level] ?? 0) + 1;
    }

    return {
      columns,
      summary: {
        totalPatients,
        waiting: columns.waiting.length,
        triage: columns.triage.length,
        treatment: columns.treatment.length,
        observation: columns.observation.length,
        discharge: columns.discharge.length,
        manchesterDistribution,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  // ─── Door-to-X Metrics ────────────────────────────────────────────────────

  async getDoorMetrics(tenantId: string, dateRange: DateRangeDto) {
    const from = new Date(dateRange.startDate);
    const to = new Date(dateRange.endDate);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[EMERGENCY:' },
        createdAt: { gte: from, lte: to },
      },
      orderBy: { createdAt: 'desc' },
    });

    const doorToTriageTimes: number[] = [];
    const doorToDoctorTimes: number[] = [];
    const doorToNeedleTimes: number[] = [];
    const doorToBalloonTimes: number[] = [];

    for (const doc of docs) {
      const content = this.parseContent(doc.content);
      const doorTime = content.doorTime as string | undefined;
      if (!doorTime) continue;
      const doorMs = new Date(doorTime).getTime();

      // Door-to-triage
      if (content.triageTime) {
        doorToTriageTimes.push((new Date(content.triageTime as string).getTime() - doorMs) / 60000);
      }

      // Door-to-doctor (first treatment status)
      const history = Array.isArray(content.statusHistory) ? content.statusHistory : [];
      const treatmentEntry = history.find((h: Record<string, unknown>) => h.status === 'IN_TREATMENT');
      if (treatmentEntry) {
        doorToDoctorTimes.push((new Date(treatmentEntry.at as string).getTime() - doorMs) / 60000);
      }

      // Door-to-needle (stroke rt-PA)
      if (content.protocolType === 'CODE_STROKE' && content.rtpaTime) {
        doorToNeedleTimes.push((new Date(content.rtpaTime as string).getTime() - doorMs) / 60000);
      }

      // Door-to-balloon (STEMI)
      if (content.protocolType === 'CODE_STEMI' && content.doorToBalloonMinutes) {
        doorToBalloonTimes.push(content.doorToBalloonMinutes as number);
      }
    }

    const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    const median = (arr: number[]) => {
      if (arr.length === 0) return null;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? Math.round(sorted[mid]) : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    };

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      doorToTriage: {
        count: doorToTriageTimes.length,
        avgMinutes: avg(doorToTriageTimes),
        medianMinutes: median(doorToTriageTimes),
        target: 10,
        withinTarget: doorToTriageTimes.filter((t) => t <= 10).length,
      },
      doorToDoctor: {
        count: doorToDoctorTimes.length,
        avgMinutes: avg(doorToDoctorTimes),
        medianMinutes: median(doorToDoctorTimes),
        target: 60,
        withinTarget: doorToDoctorTimes.filter((t) => t <= 60).length,
      },
      doorToNeedle: {
        count: doorToNeedleTimes.length,
        avgMinutes: avg(doorToNeedleTimes),
        medianMinutes: median(doorToNeedleTimes),
        target: 60,
        withinTarget: doorToNeedleTimes.filter((t) => t <= 60).length,
        description: 'Tempo porta-agulha (AVC isquêmico → rt-PA)',
      },
      doorToBalloon: {
        count: doorToBalloonTimes.length,
        avgMinutes: avg(doorToBalloonTimes),
        medianMinutes: median(doorToBalloonTimes),
        target: 90,
        withinTarget: doorToBalloonTimes.filter((t) => t <= 90).length,
        description: 'Tempo porta-balão (STEMI → angioplastia)',
      },
      totalPatients: docs.length,
    };
  }

  // ─── Queue Management ─────────────────────────────────────────────────────

  async manageQueue(tenantId: string, dto: ManageQueueDto) {
    const now = new Date();

    if (dto.action === QueueAction.GENERATE_TICKET) {
      // Get last ticket number for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTickets = await this.prisma.clinicalDocument.findMany({
        where: {
          tenantId,
          title: { startsWith: '[EMERGENCY:QUEUE_TICKET]' },
          createdAt: { gte: today },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      let lastNumber = 0;
      if (todayTickets.length > 0) {
        const content = this.parseContent(todayTickets[0].content);
        lastNumber = (content.ticketNumber as number) ?? 0;
      }

      const ticketNumber = lastNumber + 1;
      const prefix = dto.priority === 'PRIORITY' ? 'P' : 'N';
      const ticketCode = `${prefix}${String(ticketNumber).padStart(3, '0')}`;

      const doc = await this.prisma.clinicalDocument.create({
        data: this.buildDocData(
          tenantId,
          dto.patientId ?? 'SYSTEM',
          dto.authorId,
          'QUEUE_TICKET',
          `Senha ${ticketCode}`,
          {
            ticketNumber,
            ticketCode,
            priority: dto.priority ?? 'NORMAL',
            sector: dto.sector ?? 'GERAL',
            status: 'WAITING',
            issuedAt: now.toISOString(),
          },
        ),
      });

      return { id: doc.id, ticketCode, ticketNumber, status: 'WAITING', issuedAt: now.toISOString() };
    }

    if (dto.action === QueueAction.CALL_NEXT) {
      // Find oldest waiting ticket in sector
      const sector = dto.sector ?? 'GERAL';
      const waitingDocs = await this.prisma.clinicalDocument.findMany({
        where: {
          tenantId,
          title: { startsWith: '[EMERGENCY:QUEUE_TICKET]' },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      const waitingTickets = waitingDocs
        .map((d) => ({ id: d.id, content: this.parseContent(d.content) }))
        .filter((t) => t.content.status === 'WAITING' && (t.content.sector === sector || !dto.sector));

      // Priority tickets first
      const priorityTicket = waitingTickets.find((t) => t.content.priority === 'PRIORITY');
      const nextTicket = priorityTicket ?? waitingTickets[0];

      if (!nextTicket) {
        return { message: 'Nenhum paciente na fila', queue: [] };
      }

      const updatedContent: Record<string, unknown> = { ...nextTicket.content, status: 'CALLED', calledAt: now.toISOString() };
      await this.prisma.clinicalDocument.update({
        where: { id: nextTicket.id },
        data: { content: JSON.stringify(updatedContent) },
      });

      // Calculate average wait
      const calledTickets = waitingDocs
        .map((d) => this.parseContent(d.content))
        .filter((c) => c.calledAt && c.issuedAt);
      let avgWaitMinutes = 0;
      if (calledTickets.length > 0) {
        const totalWait = calledTickets.reduce((sum, t) => {
          return sum + (new Date(t.calledAt as string).getTime() - new Date(t.issuedAt as string).getTime()) / 60000;
        }, 0);
        avgWaitMinutes = Math.round(totalWait / calledTickets.length);
      }

      return {
        calledTicket: { id: nextTicket.id, ticketCode: updatedContent.ticketCode as string },
        remainingInQueue: waitingTickets.length - 1,
        averageWaitMinutes: avgWaitMinutes,
      };
    }

    return { action: dto.action, status: 'processed', timestamp: now.toISOString() };
  }

  // ─── Fast Track (with DTO) ────────────────────────────────────────────────

  async createFastTrack(tenantId: string, dto: CreateFastTrackDto) {
    const doc = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'FAST_TRACK',
        `Fast Track — ${dto.chiefComplaint}`,
        {
          chiefComplaint: dto.chiefComplaint,
          fastTrack: true,
          fastTrackAssignedAt: new Date().toISOString(),
          currentStatus: 'IN_TREATMENT',
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });

    return {
      id: doc.id,
      fastTrack: true,
      message: 'Paciente encaminhado para Fast Track',
      createdAt: doc.createdAt,
    };
  }

  // ─── Code Stroke (AVC) ────────────────────────────────────────────────────

  async activateCodeStroke(tenantId: string, dto: ActivateCodeStrokeDto) {
    // Calculate NIHSS total
    const nihssTotal = dto.nihssItems.reduce((sum, item) => sum + item.score, 0);

    let nihssSeverity: string;
    if (nihssTotal === 0) nihssSeverity = 'SEM_DEFICIT';
    else if (nihssTotal <= 4) nihssSeverity = 'LEVE';
    else if (nihssTotal <= 15) nihssSeverity = 'MODERADO';
    else if (nihssTotal <= 20) nihssSeverity = 'MODERADO_GRAVE';
    else nihssSeverity = 'GRAVE';

    // Check rt-PA window (4.5h from last known normal)
    const lknTime = new Date(dto.lastKnownNormal).getTime();
    const now = Date.now();
    const hoursFromLKN = (now - lknTime) / (1000 * 60 * 60);
    const withinRtpaWindow = hoursFromLKN <= 4.5;
    const withinThrombectomyWindow = hoursFromLKN <= 24; // Extended window with imaging selection

    // rt-PA eligibility
    const rtpaEligible = withinRtpaWindow && !dto.rtpaContraindicated && dto.ctResult !== 'HEMORRHAGIC';

    // Thrombectomy criteria: LVO + NIHSS >= 6 + within window
    const thrombectomyEligible = dto.largeVesselOcclusion === true && nihssTotal >= 6 && withinThrombectomyWindow;

    const alerts: string[] = [];
    if (nihssTotal >= 6) alerts.push(`NIHSS ${nihssTotal} — AVC ${nihssSeverity}`);
    if (rtpaEligible && !dto.rtpaAdministered) alerts.push('ELEGÍVEL PARA rt-PA — administrar IMEDIATAMENTE');
    if (thrombectomyEligible) alerts.push('CANDIDATO A TROMBECTOMIA MECÂNICA — acionar neurointervenção');
    if (!dto.ctCompleted) alerts.push('TC DE CRÂNIO PENDENTE — realizar em até 25 min da chegada');
    if (hoursFromLKN > 4.5 && hoursFromLKN <= 24) alerts.push('Janela de rt-PA ultrapassada. Avaliar trombectomia se LVO.');

    const doc = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'CODE_STROKE',
        `Código AVC — NIHSS ${nihssTotal} (${nihssSeverity})`,
        {
          protocolType: 'CODE_STROKE',
          nihssItems: dto.nihssItems,
          nihssTotal,
          nihssSeverity,
          lastKnownNormal: dto.lastKnownNormal,
          symptomOnset: dto.symptomOnset,
          hoursFromLKN: Math.round(hoursFromLKN * 10) / 10,
          ctCompleted: dto.ctCompleted,
          ctResult: dto.ctResult,
          withinRtpaWindow,
          rtpaEligible,
          rtpaContraindicated: dto.rtpaContraindicated ?? false,
          rtpaAdministered: dto.rtpaAdministered ?? false,
          rtpaTime: dto.rtpaTime,
          doorToRtpaMinutes: dto.rtpaTime
            ? Math.round((new Date(dto.rtpaTime).getTime() - now) / 60000 + hoursFromLKN * 60)
            : null,
          thrombectomyCandidate: thrombectomyEligible,
          largeVesselOcclusion: dto.largeVesselOcclusion,
          thrombectomyChecklist: dto.thrombectomyChecklist,
          alerts,
          activatedAt: new Date().toISOString(),
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });

    this.logger.warn(`CODE STROKE activated for patient ${dto.patientId} — NIHSS ${nihssTotal}`);

    return {
      id: doc.id,
      nihssTotal,
      nihssSeverity,
      rtpaEligible,
      thrombectomyEligible,
      alerts,
      hoursFromLKN: Math.round(hoursFromLKN * 10) / 10,
      createdAt: doc.createdAt,
    };
  }

  // ─── Code STEMI ───────────────────────────────────────────────────────────

  async activateCodeSTEMI(tenantId: string, dto: ActivateCodeSTEMIDto) {
    // TIMI risk score auto-calculation
    let timiScore = dto.timiScore ?? 0;
    if (dto.timiScore === undefined) {
      if (dto.age65orOlder) timiScore++;
      if (dto.threePlusCardiacRiskFactors) timiScore++;
      if (dto.knownCAD50Percent) timiScore++;
      if (dto.aspirinUseLast7Days) timiScore++;
      if (dto.severAnginaTwoPlusEpisodesIn24h) timiScore++;
      if (dto.stDeviationHalfMmOrMore) timiScore++;
      if (dto.elevatedCardiacMarkers) timiScore++;
    }

    let timiRisk: string;
    if (timiScore <= 2) timiRisk = 'LOW';
    else if (timiScore <= 4) timiRisk = 'INTERMEDIATE';
    else timiRisk = 'HIGH';

    // KILLIP classification interpretation
    const killipDescriptions: Record<number, string> = {
      1: 'Sem sinais de IC (mortalidade 6%)',
      2: 'Estertores, B3, congestão pulmonar (mortalidade 17%)',
      3: 'Edema agudo de pulmão (mortalidade 38%)',
      4: 'Choque cardiogênico (mortalidade 81%)',
    };

    const killipMortality: Record<number, number> = { 1: 6, 2: 17, 3: 38, 4: 81 };

    const alerts: string[] = [];
    if (!dto.ecgWithin10Min) alerts.push('ECG NÃO REALIZADO EM 10 MIN — realizar IMEDIATAMENTE');
    if (!dto.cathLabActivated) alerts.push('HEMODINÂMICA NÃO ATIVADA — acionar equipe AGORA');
    if (dto.doorToBalloonMinutes !== undefined && dto.doorToBalloonMinutes > 90) {
      alerts.push(`TEMPO PORTA-BALÃO ${dto.doorToBalloonMinutes} min — ACIMA DA META DE 90 min`);
    }
    if (dto.killipClass >= 3) alerts.push(`KILLIP ${dto.killipClass} — ${killipDescriptions[dto.killipClass]}`);
    if (timiScore >= 5) alerts.push(`TIMI Score ${timiScore}/7 — ALTO RISCO`);

    const doc = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'CODE_STEMI',
        `Código STEMI — KILLIP ${dto.killipClass}, TIMI ${timiScore}`,
        {
          protocolType: 'CODE_STEMI',
          ecgWithin10Min: dto.ecgWithin10Min,
          ecgTime: dto.ecgTime,
          ecgFindings: dto.ecgFindings,
          cathLabActivated: dto.cathLabActivated,
          cathLabActivationTime: dto.cathLabActivationTime,
          doorToBalloonMinutes: dto.doorToBalloonMinutes,
          killipClass: dto.killipClass,
          killipDescription: killipDescriptions[dto.killipClass],
          killipMortality: killipMortality[dto.killipClass],
          timiScore,
          timiRisk,
          troponinValue: dto.troponinValue,
          ckMbValue: dto.ckMbValue,
          alerts,
          activatedAt: new Date().toISOString(),
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });

    this.logger.warn(`CODE STEMI activated for patient ${dto.patientId} — KILLIP ${dto.killipClass}`);

    return {
      id: doc.id,
      killipClass: dto.killipClass,
      killipDescription: killipDescriptions[dto.killipClass],
      timiScore,
      timiRisk,
      doorToBalloonMinutes: dto.doorToBalloonMinutes,
      alerts,
      createdAt: doc.createdAt,
    };
  }

  // ─── Code Sepsis ──────────────────────────────────────────────────────────

  async activateCodeSepsis(tenantId: string, dto: ActivateCodeSepsisDto) {
    // qSOFA calculation (0-3)
    let qsofa = 0;
    const qsofaCriteria: string[] = [];
    if (dto.respiratoryRate !== undefined && dto.respiratoryRate >= 22) {
      qsofa++;
      qsofaCriteria.push(`FR ≥ 22 (${dto.respiratoryRate})`);
    }
    if (dto.systolicBp !== undefined && dto.systolicBp <= 100) {
      qsofa++;
      qsofaCriteria.push(`PAS ≤ 100 (${dto.systolicBp})`);
    }
    if (dto.gcs !== undefined && dto.gcs < 15) {
      qsofa++;
      qsofaCriteria.push(`GCS < 15 (${dto.gcs})`);
    }

    // SOFA calculation
    let sofa = 0;

    // Respiration
    if (dto.pao2fio2 !== undefined) {
      if (dto.pao2fio2 < 100) sofa += 4;
      else if (dto.pao2fio2 < 200) sofa += 3;
      else if (dto.pao2fio2 < 300) sofa += 2;
      else if (dto.pao2fio2 < 400) sofa += 1;
    }

    // Coagulation
    if (dto.platelets !== undefined) {
      if (dto.platelets < 20) sofa += 4;
      else if (dto.platelets < 50) sofa += 3;
      else if (dto.platelets < 100) sofa += 2;
      else if (dto.platelets < 150) sofa += 1;
    }

    // Liver
    if (dto.bilirubin !== undefined) {
      if (dto.bilirubin >= 12) sofa += 4;
      else if (dto.bilirubin >= 6) sofa += 3;
      else if (dto.bilirubin >= 2) sofa += 2;
      else if (dto.bilirubin >= 1.2) sofa += 1;
    }

    // Cardiovascular
    if (dto.vasopressorDose !== undefined && dto.vasopressorDose > 0.1) sofa += 4;
    else if (dto.vasopressorDose !== undefined && dto.vasopressorDose > 0) sofa += 3;
    else if (dto.cardiovascularMap !== undefined && dto.cardiovascularMap < 70) sofa += 1;

    // CNS
    if (dto.gcs !== undefined) {
      if (dto.gcs < 6) sofa += 4;
      else if (dto.gcs < 10) sofa += 3;
      else if (dto.gcs < 13) sofa += 2;
      else if (dto.gcs < 15) sofa += 1;
    }

    // Renal
    if (dto.creatinine !== undefined) {
      if (dto.creatinine >= 5 || (dto.urineOutputMl24h !== undefined && dto.urineOutputMl24h < 200)) sofa += 4;
      else if (dto.creatinine >= 3.5 || (dto.urineOutputMl24h !== undefined && dto.urineOutputMl24h < 500)) sofa += 3;
      else if (dto.creatinine >= 2) sofa += 2;
      else if (dto.creatinine >= 1.2) sofa += 1;
    }

    // 1-hour bundle compliance
    const bundleItems = [
      { item: 'Lactato medido', done: dto.lactateMeasured ?? false },
      { item: 'Hemoculturas coletadas', done: dto.bloodCulturesCollected ?? false },
      { item: 'Antibiótico administrado', done: dto.antibioticsAdministered ?? false },
      { item: 'Cristalóide (30 mL/kg) iniciado', done: dto.crystalloidBolus ?? false },
      { item: 'Vasopressor se PAM < 65', done: dto.vasopressorStarted ?? false },
    ];
    const bundleCompliance = Math.round(
      (bundleItems.filter((b) => b.done).length / bundleItems.length) * 100,
    );

    // Sepsis severity
    let severity: string;
    if (sofa >= 2 && (dto.lactateValue ?? 0) > 4) severity = 'CHOQUE_SEPTICO';
    else if (sofa >= 2) severity = 'SEPSE';
    else if (qsofa >= 2) severity = 'SUSPEITA_SEPSE';
    else severity = 'RISCO_BAIXO';

    const alerts: string[] = [];
    if (qsofa >= 2) alerts.push(`qSOFA ${qsofa}/3 — SUSPEITA DE SEPSE. Critérios: ${qsofaCriteria.join(', ')}`);
    if (sofa >= 2) alerts.push(`SOFA ${sofa} — Disfunção orgânica confirmada`);
    if ((dto.lactateValue ?? 0) > 4) alerts.push(`Lactato ${dto.lactateValue} mmol/L — CHOQUE SÉPTICO`);
    if (!(dto.antibioticsAdministered ?? false)) alerts.push('ATB PENDENTE — administrar em até 1 HORA');
    if (!(dto.bloodCulturesCollected ?? false)) alerts.push('HEMOCULTURAS PENDENTES — coletar ANTES do ATB');
    if (bundleCompliance < 100) alerts.push(`Bundle 1h: ${bundleCompliance}% completo`);

    const doc = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'CODE_SEPSIS',
        `Código Sepse — qSOFA ${qsofa}, SOFA ${sofa} (${severity})`,
        {
          protocolType: 'CODE_SEPSIS',
          qsofa,
          qsofaCriteria,
          sofa,
          severity,
          lactateValue: dto.lactateValue,
          bundle1h: bundleItems,
          bundleCompliance,
          suspectedSource: dto.suspectedSource,
          antibioticsUsed: dto.antibioticsUsed,
          antibioticsTime: dto.antibioticsTime,
          bloodCulturesTime: dto.bloodCulturesTime,
          crystalloidVolumeMl: dto.crystalloidVolumeMl,
          vasopressorType: dto.vasopressorType,
          alerts,
          activatedAt: new Date().toISOString(),
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });

    this.logger.warn(`CODE SEPSIS activated for patient ${dto.patientId} — ${severity}`);

    return {
      id: doc.id,
      qsofa,
      sofa,
      severity,
      bundleCompliance,
      alerts,
      createdAt: doc.createdAt,
    };
  }

  // ─── Code Trauma ──────────────────────────────────────────────────────────

  async activateCodeTrauma(tenantId: string, dto: ActivateCodeTraumaDto) {
    const abcde = dto.abcde;

    // RTS (Revised Trauma Score) calculation
    let rts: number | null = null;
    if (dto.rtsComponents) {
      const gcsCode = this.rtsGcsCode(dto.rtsComponents.gcs);
      const sbpCode = this.rtsSbpCode(dto.rtsComponents.systolicBp);
      const rrCode = this.rtsRrCode(dto.rtsComponents.respiratoryRate);
      rts = Math.round((0.9368 * gcsCode + 0.7326 * sbpCode + 0.2908 * rrCode) * 100) / 100;
    }

    // TRISS (Trauma and Injury Severity Score) calculation
    let triss: number | null = null;
    if (rts !== null && dto.iss !== undefined) {
      // Blunt trauma coefficients (most common)
      const b0 = -1.2470;
      const b1 = 0.9544;
      const b2 = -0.0768;
      const b3 = -1.9052;
      const logit = b0 + b1 * rts + b2 * dto.iss + b3 * 0; // age = 0 for <55, 1 for >=55
      triss = Math.round((1 / (1 + Math.exp(-logit))) * 100 * 10) / 10;
    }

    // ABCDE summary with timestamps
    const abcdeSummary = {
      A: `Via aérea ${abcde.airway.patent ? 'pérvia' : 'COMPROMETIDA'}. C-spine ${abcde.airway.cSpineProtected ? 'protegida' : 'NÃO protegida'}.`,
      B: `FR ${abcde.breathing.respiratoryRate}, SpO2 ${abcde.breathing.spo2}%. MV ${abcde.breathing.lungSoundsSymmetric ? 'simétrico' : 'ASSIMÉTRICO'}.`,
      C: `FC ${abcde.circulation.heartRate}, PAS ${abcde.circulation.systolicBp}. TEC ${abcde.circulation.capillaryRefill}. Acesso IV: ${abcde.circulation.ivAccess ? 'sim' : 'não'}.`,
      D: `GCS ${abcde.disability.gcs} (E${abcde.disability.gcsEye}V${abcde.disability.gcsVerbal}M${abcde.disability.gcsMotor}). Pupilas: ${abcde.disability.pupils}. Lateralização: ${abcde.disability.lateralization ? 'SIM' : 'não'}.`,
      E: `Temp ${abcde.exposure.temperature}°C. Lesões: ${abcde.exposure.injuriesFound.join(', ') || 'nenhuma identificada'}.`,
    };

    const alerts: string[] = [];
    if (!abcde.airway.patent) alerts.push('VIA AÉREA COMPROMETIDA — intervenção imediata');
    if (abcde.breathing.spo2 < 90) alerts.push(`SpO2 ${abcde.breathing.spo2}% — HIPOXEMIA GRAVE`);
    if (abcde.circulation.systolicBp < 90) alerts.push(`PAS ${abcde.circulation.systolicBp} — CHOQUE`);
    if (abcde.disability.gcs <= 8) alerts.push(`GCS ${abcde.disability.gcs} — considerar IOT`);
    if (dto.fastPositive) alerts.push('FAST POSITIVO — considerar laparotomia exploradora');
    if (dto.iss !== undefined && dto.iss > 15) alerts.push(`ISS ${dto.iss} — TRAUMA GRAVE (multitrauma)`);

    const doc = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'CODE_TRAUMA',
        `Código Trauma — GCS ${abcde.disability.gcs}, ISS ${dto.iss ?? 'pending'}`,
        {
          protocolType: 'CODE_TRAUMA',
          mechanism: dto.mechanism,
          abcde: dto.abcde,
          abcdeSummary,
          fastPerformed: dto.fastPerformed,
          fastPositive: dto.fastPositive,
          fastDetails: dto.fastDetails,
          iss: dto.iss,
          rts,
          triss,
          alerts,
          activatedAt: new Date().toISOString(),
          timestamps: {
            arrivalAt: new Date().toISOString(),
          },
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });

    this.logger.warn(`CODE TRAUMA activated for patient ${dto.patientId} — ${dto.mechanism}`);

    return {
      id: doc.id,
      gcs: abcde.disability.gcs,
      iss: dto.iss,
      rts,
      triss,
      fastPositive: dto.fastPositive,
      abcdeSummary,
      alerts,
      createdAt: doc.createdAt,
    };
  }

  private rtsGcsCode(gcs: number): number {
    if (gcs >= 13) return 4;
    if (gcs >= 9) return 3;
    if (gcs >= 6) return 2;
    if (gcs >= 4) return 1;
    return 0;
  }

  private rtsSbpCode(sbp: number): number {
    if (sbp > 89) return 4;
    if (sbp >= 76) return 3;
    if (sbp >= 50) return 2;
    if (sbp >= 1) return 1;
    return 0;
  }

  private rtsRrCode(rr: number): number {
    if (rr >= 10 && rr <= 29) return 4;
    if (rr > 29) return 3;
    if (rr >= 6) return 2;
    if (rr >= 1) return 1;
    return 0;
  }

  // ─── Code Blue (Cardiac Arrest) ───────────────────────────────────────────

  async activateCodeBlue(tenantId: string, dto: ActivateCodeBlueDto) {
    const isShockable = ['VF', 'VT', 'VENTRICULAR_FIBRILLATION', 'VENTRICULAR_TACHYCARDIA'].includes(dto.initialRhythm.toUpperCase());

    // Utstein reporting variables
    const arrestTime = dto.arrestTime ? new Date(dto.arrestTime) : new Date();
    const roscTime = dto.roscTime ? new Date(dto.roscTime) : null;
    const roscAchieved = roscTime !== null;
    const roscDurationMin = roscTime ? Math.round((roscTime.getTime() - arrestTime.getTime()) / 60000) : null;

    // Drug summary
    const epinephrineDoses = (dto.drugs ?? []).filter((d) => d.drug.toLowerCase().includes('epinefrina') || d.drug.toLowerCase().includes('adrenalina'));
    const amiodaroneDoses = (dto.drugs ?? []).filter((d) => d.drug.toLowerCase().includes('amiodarona'));
    const defibCount = (dto.defibrillations ?? []).length;
    const cprCycleCount = (dto.cprCycles ?? []).length;

    const utstein = {
      witnessed: dto.witnessed ?? false,
      initialRhythm: dto.initialRhythm,
      shockableRhythm: isShockable,
      arrestTime: arrestTime.toISOString(),
      firstCprTime: dto.cprCycles?.[0]?.startTime ?? null,
      firstShockTime: dto.defibrillations?.[0]?.time ?? null,
      firstEpinephrineTime: epinephrineDoses[0]?.time ?? null,
      totalEpinephrineDoses: epinephrineDoses.length,
      totalAmiodaroneDoses: amiodaroneDoses.length,
      totalDefibrillations: defibCount,
      totalCprCycles: cprCycleCount,
      roscAchieved,
      roscTime: dto.roscTime ?? null,
      roscDurationMin,
      outcome: dto.outcome ?? (roscAchieved ? 'ROSC' : 'ONGOING'),
    };

    const alerts: string[] = [];
    if (isShockable) alerts.push(`Ritmo chocável (${dto.initialRhythm}) — DESFIBRILAR IMEDIATAMENTE`);
    else alerts.push(`Ritmo não chocável (${dto.initialRhythm}) — EPINEFRINA 1 mg IV a cada 3-5 min`);
    if (epinephrineDoses.length === 0) alerts.push('EPINEFRINA NÃO ADMINISTRADA');
    if (isShockable && defibCount === 0) alerts.push('DESFIBRILAÇÃO NÃO REALIZADA — choque indicado');

    const doc = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'CODE_BLUE',
        `Código Azul — ${dto.initialRhythm} ${roscAchieved ? '→ ROSC' : ''}`,
        {
          protocolType: 'CODE_BLUE',
          ...utstein,
          cprCycles: dto.cprCycles,
          drugs: dto.drugs,
          defibrillations: dto.defibrillations,
          airway: dto.airway,
          alerts,
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });

    this.logger.warn(`CODE BLUE activated for patient ${dto.patientId} — ${dto.initialRhythm}`);

    return {
      id: doc.id,
      utstein,
      alerts,
      createdAt: doc.createdAt,
    };
  }

  // ─── Chest Pain Protocol ──────────────────────────────────────────────────

  async createChestPainProtocol(tenantId: string, dto: CreateChestPainProtocolDto) {
    // HEART Score calculation
    let heartScore: number | null = null;
    let heartRisk: string | null = null;
    let heartRecommendation: string | null = null;

    if (
      dto.heartHistory !== undefined &&
      dto.heartEcg !== undefined &&
      dto.heartAge !== undefined &&
      dto.heartRisk !== undefined &&
      dto.heartTroponin !== undefined
    ) {
      heartScore = dto.heartHistory + dto.heartEcg + dto.heartAge + dto.heartRisk + dto.heartTroponin;

      if (heartScore <= 3) {
        heartRisk = 'LOW';
        heartRecommendation = 'HEART ≤ 3 — Baixo risco (1.7% MACE). Considerar alta com seguimento ambulatorial.';
      } else if (heartScore <= 6) {
        heartRisk = 'INTERMEDIATE';
        heartRecommendation = 'HEART 4-6 — Risco intermediário (12-16% MACE). Observação + troponina seriada + teste funcional.';
      } else {
        heartRisk = 'HIGH';
        heartRecommendation = 'HEART ≥ 7 — Alto risco (50-65% MACE). Internação + cateterismo cardíaco precoce.';
      }
    }

    // Troponin delta analysis
    let troponinDelta: number | null = null;
    let troponinTrend: string | null = null;
    if (dto.troponinSeries && dto.troponinSeries.length >= 2) {
      const sorted = [...dto.troponinSeries].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      const first = sorted[0].value;
      const last = sorted[sorted.length - 1].value;
      troponinDelta = Math.round((last - first) * 1000) / 1000;
      const reference = sorted[0].reference;
      troponinTrend = last > reference * 3 ? 'POSITIVE_SIGNIFICANT' :
        last > reference ? 'POSITIVE_BORDERLINE' : 'NEGATIVE';
    }

    // Decision: admit vs discharge
    let decision: string;
    if (dto.stElevation) decision = 'ADMIT_CATH_LAB';
    else if (heartScore !== null && heartScore >= 7) decision = 'ADMIT_CCU';
    else if (heartScore !== null && heartScore >= 4) decision = 'OBSERVE_CDU';
    else if (troponinTrend === 'POSITIVE_SIGNIFICANT') decision = 'ADMIT_CCU';
    else decision = 'CONSIDER_DISCHARGE';

    const doc = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'CHEST_PAIN',
        `Protocolo Dor Torácica — HEART ${heartScore ?? 'pending'}, Decisão: ${decision}`,
        {
          protocolType: 'CHEST_PAIN',
          ecgTime: dto.ecgTime,
          ecgFindings: dto.ecgFindings,
          stElevation: dto.stElevation,
          troponinSeries: dto.troponinSeries,
          troponinDelta,
          troponinTrend,
          heartScore,
          heartComponents: {
            history: dto.heartHistory,
            ecg: dto.heartEcg,
            age: dto.heartAge,
            riskFactors: dto.heartRisk,
            troponin: dto.heartTroponin,
          },
          heartRisk,
          heartRecommendation,
          timiScore: dto.timiScore,
          decision,
          evaluatedAt: new Date().toISOString(),
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });

    return {
      id: doc.id,
      heartScore,
      heartRisk,
      heartRecommendation,
      troponinDelta,
      troponinTrend,
      decision,
      createdAt: doc.createdAt,
    };
  }

  // ─── Observation Unit (CDU) ───────────────────────────────────────────────

  async createObservationUnit(tenantId: string, dto: CreateObservationUnitDto) {
    const admittedAt = new Date();
    const maxStayMs = dto.maxStayHours * 60 * 60 * 1000;
    const deadlineAt = new Date(admittedAt.getTime() + maxStayMs);

    // Default reassessment intervals: every 4h, or custom
    const intervals = dto.reassessmentIntervals ?? [4, 8, 12, 16, 20, 24];
    const reassessmentSchedule = intervals
      .filter((h) => h <= dto.maxStayHours)
      .map((h) => ({
        hours: h,
        scheduledAt: new Date(admittedAt.getTime() + h * 60 * 60 * 1000).toISOString(),
        completed: false,
      }));

    const doc = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        dto.patientId,
        dto.authorId,
        'CDU',
        `CDU — ${dto.reason} (máx ${dto.maxStayHours}h)`,
        {
          protocolType: 'OBSERVATION_UNIT',
          reason: dto.reason,
          admittedAt: admittedAt.toISOString(),
          maxStayHours: dto.maxStayHours,
          deadlineAt: deadlineAt.toISOString(),
          reassessmentSchedule,
          monitoringPlan: dto.monitoringPlan,
          currentStatus: 'OBSERVATION',
          notes: dto.notes,
        },
        dto.encounterId,
      ),
    });

    return {
      id: doc.id,
      admittedAt: admittedAt.toISOString(),
      deadlineAt: deadlineAt.toISOString(),
      maxStayHours: dto.maxStayHours,
      reassessmentSchedule,
      createdAt: doc.createdAt,
    };
  }

  // ─── SBAR/I-PASS Handoff ──────────────────────────────────────────────────

  async createHandoff(tenantId: string, dto: CreateEmergencyHandoffDto) {
    const format = dto.format.toUpperCase();
    const patientEntries = dto.patients.map((p) => {
      if (format === 'SBAR') {
        return {
          patientId: p.patientId,
          situation: p.situation ?? '',
          background: p.background ?? '',
          assessment: p.assessment ?? '',
          recommendation: p.recommendation ?? '',
        };
      }
      // I-PASS
      return {
        patientId: p.patientId,
        illness: p.illness ?? '',
        patientSummary: p.patientSummary ?? '',
        actionList: p.actionList ?? '',
        synthesize: p.synthesize ?? '',
        contingency: p.contingency ?? '',
      };
    });

    const doc = await this.prisma.clinicalDocument.create({
      data: this.buildDocData(
        tenantId,
        'SYSTEM',
        dto.authorId,
        'HANDOFF',
        `Passagem de Plantão ${format} — ${dto.patients.length} paciente(s)`,
        {
          format,
          sector: dto.sector,
          shift: dto.shift,
          fromAuthor: dto.authorId,
          toReceiver: dto.receiverId,
          patients: patientEntries,
          handoffAt: new Date().toISOString(),
          notes: dto.notes,
        },
      ),
    });

    return {
      id: doc.id,
      format,
      patientCount: dto.patients.length,
      createdAt: doc.createdAt,
    };
  }

  // ─── Enhanced NEDOCS ──────────────────────────────────────────────────────

  async calculateEnhancedNEDOCS(tenantId: string) {
    // Auto-gather data from current emergency state
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[EMERGENCY:' },
        status: { not: 'VOIDED' },
        createdAt: { gte: today },
      },
    });

    // Count patients by status
    const patientStatuses = new Map<string, string>();
    for (const doc of docs) {
      const content = this.parseContent(doc.content);
      if (!patientStatuses.has(doc.patientId)) {
        patientStatuses.set(doc.patientId, (content.currentStatus as string) ?? 'WAITING');
      }
    }

    const totalEdPatients = patientStatuses.size;
    const admittedWaiting = Array.from(patientStatuses.values()).filter((s) => s === 'ADMITTED').length;
    const inObservation = Array.from(patientStatuses.values()).filter((s) => s === 'OBSERVATION').length;

    // Auto-alert thresholds
    const alerts: string[] = [];
    if (totalEdPatients > 30) alerts.push(`${totalEdPatients} pacientes no PS — capacidade potencialmente excedida`);
    if (admittedWaiting > 5) alerts.push(`${admittedWaiting} pacientes internados aguardando leito`);

    return {
      autoCollected: true,
      totalEdPatients,
      admittedWaitingBed: admittedWaiting,
      inObservation,
      alerts,
      timestamp: now.toISOString(),
      message: 'Dados coletados automaticamente. Use POST /emergency/nedocs com dados completos para cálculo NEDOCS oficial.',
    };
  }

  private parseContent(content: string | null): Record<string, unknown> {
    if (!content) return {};
    try { return JSON.parse(content); } catch { return {}; }
  }
}
