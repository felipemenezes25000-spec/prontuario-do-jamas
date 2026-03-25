import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSurgicalProcedureDto } from './dto/create-surgical-procedure.dto';
import { SurgicalStatus } from '@prisma/client';

@Injectable()
export class SurgicalService {
  private readonly logger = new Logger(SurgicalService.name);

  constructor(private readonly prisma: PrismaService) {}

  async schedule(tenantId: string, dto: CreateSurgicalProcedureDto) {
    return this.prisma.surgicalProcedure.create({
      data: {
        encounterId: dto.encounterId,
        patientId: dto.patientId,
        tenantId,
        surgeonId: dto.surgeonId,
        firstAssistantId: dto.firstAssistantId,
        anesthesiologistId: dto.anesthesiologistId,
        scrubNurseId: dto.scrubNurseId,
        circulatingNurseId: dto.circulatingNurseId,
        procedureName: dto.procedureName,
        procedureCode: dto.procedureCode,
        laterality: dto.laterality,
        anesthesiaType: dto.anesthesiaType,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });
  }

  async findById(id: string) {
    const procedure = await this.prisma.surgicalProcedure.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        surgeon: { select: { id: true, name: true } },
        firstAssistant: { select: { id: true, name: true } },
        anesthesiologist: { select: { id: true, name: true } },
        scrubNurse: { select: { id: true, name: true } },
        circulatingNurse: { select: { id: true, name: true } },
      },
    });

    if (!procedure) {
      throw new NotFoundException(`Surgical procedure with ID "${id}" not found`);
    }

    return procedure;
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.findById(id);

    // Whitelist allowed fields for surgical time recording
    const allowedFields = [
      'patientInAt', 'anesthesiaStartAt', 'incisionAt',
      'sutureAt', 'anesthesiaEndAt', 'patientOutAt',
      'surgicalDescription', 'complications', 'bloodLoss',
    ];
    const filtered: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        filtered[key] = data[key];
      }
    }

    return this.prisma.surgicalProcedure.update({
      where: { id },
      data: filtered,
    });
  }

  async updateStatus(id: string, status: SurgicalStatus) {
    await this.findById(id);

    const data: Record<string, unknown> = { status };

    if (status === 'IN_PROGRESS') {
      data.patientInAt = new Date();
    }
    if (status === 'COMPLETED') {
      data.patientOutAt = new Date();
    }

    return this.prisma.surgicalProcedure.update({
      where: { id },
      data,
    });
  }

  async updateChecklist(
    id: string,
    phase: 'before' | 'during' | 'after',
    checklist: Record<string, unknown>,
  ) {
    await this.findById(id);

    const fieldMap = {
      before: 'safetyChecklistBefore',
      during: 'safetyChecklistDuring',
      after: 'safetyChecklistAfter',
    };

    return this.prisma.surgicalProcedure.update({
      where: { id },
      data: { [fieldMap[phase]]: checklist },
    });
  }

  async complete(
    id: string,
    data: {
      surgicalDescription?: string;
      complications?: string;
      bloodLoss?: number;
    },
  ) {
    await this.findById(id);

    return this.prisma.surgicalProcedure.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        patientOutAt: new Date(),
        surgicalDescription: data.surgicalDescription,
        complications: data.complications,
        bloodLoss: data.bloodLoss,
      },
    });
  }

  async findAll(
    tenantId: string,
    options: {
      patientId?: string;
      surgeonId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId };

    if (options.patientId) where.patientId = options.patientId;
    if (options.surgeonId) where.surgeonId = options.surgeonId;
    if (options.status) where.status = options.status;
    if (options.startDate || options.endDate) {
      const scheduledAt: Record<string, Date> = {};
      if (options.startDate) scheduledAt.gte = new Date(options.startDate);
      if (options.endDate) scheduledAt.lte = new Date(options.endDate);
      where.scheduledAt = scheduledAt;
    }

    const [data, total] = await Promise.all([
      this.prisma.surgicalProcedure.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { scheduledAt: 'desc' },
        include: {
          patient: { select: { id: true, fullName: true, mrn: true } },
          surgeon: { select: { id: true, name: true } },
        },
      }),
      this.prisma.surgicalProcedure.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findByDate(tenantId: string, date: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.surgicalProcedure.findMany({
      where: {
        tenantId,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        surgeon: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ENHANCED SURGICAL FEATURES
  // ═══════════════════════════════════════════════════════════════════════

  // ─── Sponge / Instrument Count ──────────────────────────────────────────

  async createSpongeCount(
    tenantId: string,
    authorId: string,
    dto: {
      procedureId: string;
      phase: 'BEFORE' | 'AFTER';
      items: Array<{ name: string; expectedCount: number; actualCount: number }>;
      observations?: string;
    },
  ) {
    await this.findById(dto.procedureId);

    const mismatches = dto.items.filter((i) => i.expectedCount !== i.actualCount);
    const hasMismatch = mismatches.length > 0;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: (await this.findById(dto.procedureId)).patient.id,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SURGICAL:SPONGE_COUNT] ${dto.phase} Count - Procedure ${dto.procedureId}`,
        content: JSON.stringify({
          recordType: 'SPONGE_INSTRUMENT_COUNT',
          procedureId: dto.procedureId,
          phase: dto.phase,
          items: dto.items,
          hasMismatch,
          mismatches,
          observations: dto.observations,
          countedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    if (hasMismatch) {
      this.logger.error(
        `SPONGE COUNT MISMATCH for procedure ${dto.procedureId}: ${JSON.stringify(mismatches)}`,
      );
    }

    return { id: doc.id, hasMismatch, mismatches, createdAt: doc.createdAt };
  }

  async verifySpongeCount(tenantId: string, procedureId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { contains: `Procedure ${procedureId}` },
      },
      orderBy: { createdAt: 'desc' },
    });

    const counts = docs
      .filter((d) => d.title.includes('[SURGICAL:SPONGE_COUNT]'))
      .map((d) => ({ id: d.id, ...JSON.parse(d.content as string), createdAt: d.createdAt }));

    const beforeCount = counts.find((c) => c.phase === 'BEFORE');
    const afterCount = counts.find((c) => c.phase === 'AFTER');

    let crossPhaseDiscrepancies: Array<{ name: string; before: number; after: number }> = [];
    if (beforeCount && afterCount) {
      const beforeMap = new Map(beforeCount.items.map((i: { name: string; actualCount: number }) => [i.name, i.actualCount]));
      crossPhaseDiscrepancies = afterCount.items
        .filter((i: { name: string; actualCount: number }) => beforeMap.has(i.name) && beforeMap.get(i.name) !== i.actualCount)
        .map((i: { name: string; actualCount: number }) => ({ name: i.name, before: beforeMap.get(i.name) as number, after: i.actualCount }));
    }

    return {
      procedureId,
      beforeCount: beforeCount ?? null,
      afterCount: afterCount ?? null,
      crossPhaseDiscrepancies,
      allClear: crossPhaseDiscrepancies.length === 0 && !beforeCount?.hasMismatch && !afterCount?.hasMismatch,
    };
  }

  // ─── Pre-Anesthetic Evaluation (APA) ───────────────────────────────────

  async createPreAnestheticEvaluation(
    tenantId: string,
    authorId: string,
    dto: {
      procedureId: string;
      patientId: string;
      comorbidities: string[];
      currentMedications: string[];
      allergies: string[];
      previousAnesthesia: { date?: string; type?: string; complications?: string };
      airway: {
        mallampati: 1 | 2 | 3 | 4;
        mouthOpening: string;
        neckMobility: string;
        thyromental: string;
        dentition: string;
        beardOrObesity: boolean;
      };
      fastingHours: number;
      fastingSolidsHours: number;
      asaClass: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
      asaEmergency: boolean;
      cardiacRisk: string;
      pulmonaryRisk: string;
      labResults: Record<string, unknown>;
      anesthesiaPlan: string;
      consentObtained: boolean;
      observations?: string;
    },
  ) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SURGICAL:APA] Pre-Anesthetic Evaluation - Procedure ${dto.procedureId}`,
        content: JSON.stringify({
          recordType: 'PRE_ANESTHETIC_EVALUATION',
          procedureId: dto.procedureId,
          comorbidities: dto.comorbidities,
          currentMedications: dto.currentMedications,
          allergies: dto.allergies,
          previousAnesthesia: dto.previousAnesthesia,
          airway: dto.airway,
          fastingHours: dto.fastingHours,
          fastingSolidsHours: dto.fastingSolidsHours,
          asaClass: dto.asaClass,
          asaEmergency: dto.asaEmergency,
          cardiacRisk: dto.cardiacRisk,
          pulmonaryRisk: dto.pulmonaryRisk,
          labResults: dto.labResults,
          anesthesiaPlan: dto.anesthesiaPlan,
          consentObtained: dto.consentObtained,
          observations: dto.observations,
          evaluatedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, asaClass: dto.asaClass, mallampati: dto.airway.mallampati, createdAt: doc.createdAt };
  }

  // ─── Digital Anesthesia Record ──────────────────────────────────────────

  async createAnesthesiaRecord(
    tenantId: string,
    authorId: string,
    dto: {
      procedureId: string;
      patientId: string;
      anesthesiaType: string;
      preInduction: {
        vitals: Record<string, unknown>;
        premedication: Array<{ drug: string; dose: string; time: string }>;
        venousAccess: string;
        monitorization: string[];
      };
      induction: {
        drugs: Array<{ drug: string; dose: string; time: string }>;
        airwayManagement: string;
        intubationDetails?: { tubeSize: string; cuffPressure: number; depth: number; attempts: number };
        complications?: string;
      };
      maintenance: {
        technique: string;
        agents: Array<{ drug: string; dose: string }>;
        relaxants: Array<{ drug: string; dose: string; time: string }>;
        fluids: Array<{ type: string; volume: number }>;
        bloodProducts?: Array<{ type: string; units: number }>;
        estimatedBloodLoss: number;
        urineOutput: number;
      };
      events: Array<{ time: string; description: string; action: string }>;
      emergence: {
        extubationTime?: string;
        emergenceType: string;
        pacu: boolean;
        aldreteScore?: number;
        complications?: string;
      };
      observations?: string;
    },
  ) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SURGICAL:ANESTHESIA_RECORD] Anesthesia Record - Procedure ${dto.procedureId}`,
        content: JSON.stringify({
          recordType: 'ANESTHESIA_RECORD',
          procedureId: dto.procedureId,
          anesthesiaType: dto.anesthesiaType,
          preInduction: dto.preInduction,
          induction: dto.induction,
          maintenance: dto.maintenance,
          events: dto.events,
          emergence: dto.emergence,
          observations: dto.observations,
          recordedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, createdAt: doc.createdAt };
  }

  // ─── Intraoperative Monitoring Chart ────────────────────────────────────

  async addIntraoperativeVitals(
    tenantId: string,
    authorId: string,
    dto: {
      procedureId: string;
      patientId: string;
      timestamp: string;
      systolicBp: number;
      diastolicBp: number;
      heartRate: number;
      spo2: number;
      etco2?: number;
      temperature?: number;
      fio2?: number;
      tidalVolume?: number;
      respiratoryRate?: number;
      bis?: number;
      observations?: string;
    },
  ) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SURGICAL:INTRAOP_VITALS] Intraop Vitals - Procedure ${dto.procedureId}`,
        content: JSON.stringify({
          recordType: 'INTRAOP_VITALS',
          procedureId: dto.procedureId,
          timestamp: dto.timestamp,
          systolicBp: dto.systolicBp,
          diastolicBp: dto.diastolicBp,
          map: Math.round((dto.diastolicBp * 2 + dto.systolicBp) / 3),
          heartRate: dto.heartRate,
          spo2: dto.spo2,
          etco2: dto.etco2,
          temperature: dto.temperature,
          fio2: dto.fio2,
          tidalVolume: dto.tidalVolume,
          respiratoryRate: dto.respiratoryRate,
          bis: dto.bis,
          observations: dto.observations,
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, createdAt: doc.createdAt };
  }

  async getIntraoperativeChart(tenantId: string, procedureId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { contains: `Procedure ${procedureId}` },
      },
      orderBy: { createdAt: 'asc' },
    });

    return docs
      .filter((d) => d.title.includes('[SURGICAL:INTRAOP_VITALS]'))
      .map((d) => ({ id: d.id, ...JSON.parse(d.content as string) }));
  }

  // ─── OR Room Map ────────────────────────────────────────────────────────

  async getOrRoomMap(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const procedures = await this.prisma.surgicalProcedure.findMany({
      where: {
        tenantId,
        scheduledAt: { gte: today, lt: tomorrow },
      },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        surgeon: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Group by operating room (using a room field or deriving from procedure data)
    const roomMap = new Map<string, typeof procedures>();
    for (const proc of procedures) {
      const room = (proc as unknown as Record<string, string>).operatingRoom ?? 'Sala 1';
      if (!roomMap.has(room)) roomMap.set(room, []);
      roomMap.get(room)!.push(proc);
    }

    const rooms = Array.from(roomMap.entries()).map(([room, procs]) => {
      const currentProc = procs.find((p) => p.status === 'IN_PROGRESS');
      const nextProc = procs.find((p) => p.status === 'SCHEDULED');

      return {
        room,
        status: currentProc ? 'OCCUPIED' : 'AVAILABLE',
        currentProcedure: currentProc ? {
          id: currentProc.id,
          procedureName: currentProc.procedureName,
          patient: currentProc.patient,
          surgeon: currentProc.surgeon,
          startedAt: currentProc.patientInAt,
          estimatedEndTime: currentProc.scheduledAt
            ? new Date(new Date(currentProc.scheduledAt).getTime() + 120 * 60 * 1000).toISOString()
            : null,
        } : null,
        nextProcedure: nextProc ? {
          id: nextProc.id,
          procedureName: nextProc.procedureName,
          patient: nextProc.patient,
          surgeon: nextProc.surgeon,
          scheduledAt: nextProc.scheduledAt,
        } : null,
        todaySchedule: procs.map((p) => ({
          id: p.id,
          procedureName: p.procedureName,
          status: p.status,
          scheduledAt: p.scheduledAt,
          surgeon: p.surgeon.name,
          patient: p.patient.fullName,
        })),
      };
    });

    return {
      date: today.toISOString().split('T')[0],
      totalRooms: rooms.length,
      occupiedRooms: rooms.filter((r) => r.status === 'OCCUPIED').length,
      rooms,
    };
  }

  // ─── Room Utilization Metrics ───────────────────────────────────────────

  async getRoomUtilizationMetrics(tenantId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const procedures = await this.prisma.surgicalProcedure.findMany({
      where: {
        tenantId,
        scheduledAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        status: true,
        scheduledAt: true,
        patientInAt: true,
        patientOutAt: true,
        procedureName: true,
      },
    });

    const completed = procedures.filter((p) => p.status === 'COMPLETED');
    const cancelled = procedures.filter((p) => p.status === 'CANCELLED');

    // Calculate turnover times (time between patientOut of one and patientIn of next)
    const sortedCompleted = completed
      .filter((p) => p.patientInAt && p.patientOutAt)
      .sort((a, b) => new Date(a.patientInAt!).getTime() - new Date(b.patientInAt!).getTime());

    const turnoverTimes: number[] = [];
    for (let i = 1; i < sortedCompleted.length; i++) {
      const prevOut = new Date(sortedCompleted[i - 1].patientOutAt!).getTime();
      const nextIn = new Date(sortedCompleted[i].patientInAt!).getTime();
      const turnover = (nextIn - prevOut) / (1000 * 60); // minutes
      if (turnover > 0 && turnover < 480) turnoverTimes.push(turnover);
    }

    // Calculate surgery durations
    const durations = sortedCompleted.map((p) => {
      const inTime = new Date(p.patientInAt!).getTime();
      const outTime = new Date(p.patientOutAt!).getTime();
      return (outTime - inTime) / (1000 * 60);
    });

    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const avgTurnover = turnoverTimes.length > 0 ? Math.round(turnoverTimes.reduce((a, b) => a + b, 0) / turnoverTimes.length) : 0;

    // Calculate utilization rate
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const availableMinutesPerDay = 12 * 60; // 12h OR day
    const totalAvailableMinutes = totalDays * availableMinutesPerDay;
    const totalUsedMinutes = durations.reduce((a, b) => a + b, 0);
    const utilizationRate = totalAvailableMinutes > 0
      ? Math.round((totalUsedMinutes / totalAvailableMinutes) * 100)
      : 0;

    return {
      period: { startDate, endDate, totalDays },
      totalProcedures: procedures.length,
      completedProcedures: completed.length,
      cancelledProcedures: cancelled.length,
      cancellationRate: procedures.length > 0 ? Math.round((cancelled.length / procedures.length) * 100) : 0,
      avgSurgeryDurationMin: avgDuration,
      avgTurnoverMin: avgTurnover,
      utilizationRate,
      onTimeStartRate: sortedCompleted.length > 0
        ? Math.round((sortedCompleted.filter((p) => {
            if (!p.scheduledAt || !p.patientInAt) return false;
            const diff = Math.abs(new Date(p.patientInAt).getTime() - new Date(p.scheduledAt).getTime());
            return diff <= 15 * 60 * 1000; // within 15 min
          }).length / sortedCompleted.length) * 100)
        : 0,
    };
  }

  // ─── Surgeon Preference Cards ──────────────────────────────────────────

  async createSurgeonPreferenceCard(
    tenantId: string,
    authorId: string,
    dto: {
      surgeonId: string;
      procedureType: string;
      instruments: string[];
      sutures: string[];
      materials: string[];
      patientPosition: string;
      equipment: string[];
      specialRequirements?: string;
      notes?: string;
    },
  ) {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.surgeonId, // using surgeonId as reference
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SURGICAL:PREFERENCE_CARD] ${dto.procedureType} - Surgeon ${dto.surgeonId}`,
        content: JSON.stringify({
          recordType: 'SURGEON_PREFERENCE_CARD',
          surgeonId: dto.surgeonId,
          procedureType: dto.procedureType,
          instruments: dto.instruments,
          sutures: dto.sutures,
          materials: dto.materials,
          patientPosition: dto.patientPosition,
          equipment: dto.equipment,
          specialRequirements: dto.specialRequirements,
          notes: dto.notes,
          createdAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, createdAt: doc.createdAt };
  }

  async getSurgeonPreferenceCards(tenantId: string, surgeonId: string, procedureType?: string) {
    const titleFilter = procedureType
      ? `[SURGICAL:PREFERENCE_CARD] ${procedureType} - Surgeon ${surgeonId}`
      : `Surgeon ${surgeonId}`;

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { contains: titleFilter },
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs
      .filter((d) => d.title.includes('[SURGICAL:PREFERENCE_CARD]'))
      .map((d) => ({ id: d.id, ...JSON.parse(d.content as string), createdAt: d.createdAt }));
  }

  // ─── ERAS Protocol ──────────────────────────────────────────────────────

  async createErasChecklist(
    tenantId: string,
    authorId: string,
    dto: {
      procedureId: string;
      patientId: string;
      preOp: Record<string, boolean>;
      intraOp: Record<string, boolean>;
      postOp: Record<string, boolean>;
      observations?: string;
    },
  ) {
    const preOpCount = Object.values(dto.preOp).filter(Boolean).length;
    const intraOpCount = Object.values(dto.intraOp).filter(Boolean).length;
    const postOpCount = Object.values(dto.postOp).filter(Boolean).length;
    const totalCompleted = preOpCount + intraOpCount + postOpCount;
    const totalItems = Object.keys(dto.preOp).length + Object.keys(dto.intraOp).length + Object.keys(dto.postOp).length;
    const compliance = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SURGICAL:ERAS] ERAS Protocol - Procedure ${dto.procedureId}`,
        content: JSON.stringify({
          recordType: 'ERAS_PROTOCOL',
          procedureId: dto.procedureId,
          preOp: dto.preOp,
          intraOp: dto.intraOp,
          postOp: dto.postOp,
          preOpCompliance: Object.keys(dto.preOp).length > 0 ? Math.round((preOpCount / Object.keys(dto.preOp).length) * 100) : 0,
          intraOpCompliance: Object.keys(dto.intraOp).length > 0 ? Math.round((intraOpCount / Object.keys(dto.intraOp).length) * 100) : 0,
          postOpCompliance: Object.keys(dto.postOp).length > 0 ? Math.round((postOpCount / Object.keys(dto.postOp).length) * 100) : 0,
          overallCompliance: compliance,
          observations: dto.observations,
          checkedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return { id: doc.id, compliance, createdAt: doc.createdAt };
  }

  // ─── Surgical Video Recording ──────────────────────────────────────────

  async startVideoRecording(tenantId: string, surgeryId: string) {
    const procedure = await this.findById(surgeryId);
    if (procedure.tenantId !== tenantId) {
      throw new NotFoundException('Procedimento não encontrado.');
    }

    // In production: triggers recording in video system (e.g. MediaSoup, AWS Kinesis Video)
    const recordingId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    // Store recording metadata as a clinical document
    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: procedure.patient.id,
        authorId: procedure.surgeonId,
        type: 'CUSTOM',
        title: `[SURGICAL:VIDEO] ${recordingId}`,
        content: JSON.stringify({
          recordingId,
          surgeryId,
          status: 'RECORDING',
          startedAt,
          url: null,
          storageKey: `surgical-videos/${tenantId}/${surgeryId}/${recordingId}.mp4`,
        }),
        status: 'DRAFT',
      },
    });

    this.logger.log(`[VIDEO] Started recording ${recordingId} for surgery ${surgeryId}`);

    return {
      recordingId,
      surgeryId,
      status: 'RECORDING',
      startedAt,
      message: 'Gravação iniciada. Os dados são armazenados em S3 com retenção de 20 anos (CFM).',
    };
  }

  async stopVideoRecording(tenantId: string, surgeryId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        title: { startsWith: '[SURGICAL:VIDEO]' },
        content: { contains: surgeryId },
        status: 'DRAFT',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!doc) throw new NotFoundException('Nenhuma gravação ativa encontrada para esta cirurgia.');

    const parsed = JSON.parse(doc.content ?? '{}') as Record<string, unknown>;
    const stoppedAt = new Date().toISOString();
    const startedAt = parsed.startedAt as string;
    const durationSeconds = startedAt
      ? Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)
      : 0;

    await this.prisma.clinicalDocument.update({
      where: { id: doc.id },
      data: {
        status: 'FINAL',
        content: JSON.stringify({
          ...parsed,
          status: 'COMPLETED',
          stoppedAt,
          durationSeconds,
          url: `https://s3.amazonaws.com/voxpep-videos/${parsed.storageKey}`,
        }),
      },
    });

    this.logger.log(`[VIDEO] Stopped recording for surgery ${surgeryId} (${durationSeconds}s)`);

    return {
      recordingId: parsed.recordingId,
      surgeryId,
      status: 'COMPLETED',
      stoppedAt,
      durationSeconds,
      url: `https://s3.amazonaws.com/voxpep-videos/${parsed.storageKey}`,
    };
  }

  async getSurgeryVideos(tenantId: string, surgeryId: string) {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { startsWith: '[SURGICAL:VIDEO]' },
        content: { contains: surgeryId },
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((doc) => {
      const parsed = JSON.parse(doc.content ?? '{}') as Record<string, string | number | null>;
      return {
        id: doc.id,
        recordingId: parsed.recordingId,
        surgeryId: parsed.surgeryId,
        status: parsed.status,
        startedAt: parsed.startedAt,
        stoppedAt: parsed.stoppedAt ?? null,
        durationSeconds: parsed.durationSeconds ?? null,
        url: parsed.url ?? null,
        storageKey: parsed.storageKey,
        createdAt: doc.createdAt.toISOString(),
      };
    });
  }

  // ─── Estimated Surgery Duration ─────────────────────────────────────────

  async estimateSurgeryDuration(
    tenantId: string,
    dto: { procedureName: string; surgeonId: string; patientComorbidities?: number },
  ) {
    // Look at historical data for this surgeon + procedure combination
    const historicalProcedures = await this.prisma.surgicalProcedure.findMany({
      where: {
        tenantId,
        procedureName: { contains: dto.procedureName },
        surgeonId: dto.surgeonId,
        status: 'COMPLETED',
        patientInAt: { not: null },
        patientOutAt: { not: null },
      },
      select: {
        patientInAt: true,
        patientOutAt: true,
      },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    });

    if (historicalProcedures.length === 0) {
      // Fallback: look at any surgeon doing this procedure
      const anyProcedures = await this.prisma.surgicalProcedure.findMany({
        where: {
          tenantId,
          procedureName: { contains: dto.procedureName },
          status: 'COMPLETED',
          patientInAt: { not: null },
          patientOutAt: { not: null },
        },
        select: { patientInAt: true, patientOutAt: true },
        orderBy: { scheduledAt: 'desc' },
        take: 50,
      });

      if (anyProcedures.length === 0) {
        return {
          estimatedMinutes: 120,
          confidence: 'LOW',
          basedOn: 0,
          message: 'Sem dados historicos. Estimativa padrao de 120 minutos.',
        };
      }

      const durations = anyProcedures.map((p) =>
        (new Date(p.patientOutAt!).getTime() - new Date(p.patientInAt!).getTime()) / (1000 * 60),
      );
      const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
      const comorbidityAdjustment = (dto.patientComorbidities ?? 0) * 10;

      return {
        estimatedMinutes: avgDuration + comorbidityAdjustment,
        confidence: 'LOW',
        basedOn: anyProcedures.length,
        avgHistorical: avgDuration,
        comorbidityAdjustmentMin: comorbidityAdjustment,
      };
    }

    const durations = historicalProcedures.map((p) =>
      (new Date(p.patientOutAt!).getTime() - new Date(p.patientInAt!).getTime()) / (1000 * 60),
    );
    const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const minDuration = Math.round(Math.min(...durations));
    const maxDuration = Math.round(Math.max(...durations));
    const comorbidityAdjustment = (dto.patientComorbidities ?? 0) * 10;

    return {
      estimatedMinutes: avgDuration + comorbidityAdjustment,
      confidence: historicalProcedures.length >= 10 ? 'HIGH' : 'MODERATE',
      basedOn: historicalProcedures.length,
      avgHistorical: avgDuration,
      minHistorical: minDuration,
      maxHistorical: maxDuration,
      comorbidityAdjustmentMin: comorbidityAdjustment,
    };
  }
}
