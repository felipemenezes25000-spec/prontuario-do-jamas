import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SurgicalCountDto,
  CountReconciliationDto,
  CountDiscrepancyAction,
  PreAnestheticDto,
  AnesthesiaRecordDto,
  AddVitalsReadingDto,
  AddDrugAdministrationDto,
  CompleteAnesthesiaRecordDto,
  UpdateORRoomStatusDto,
  CreatePreferenceCardDto,
  UpdatePreferenceCardDto,
  ORRoomStatus,
  type ORRoomStatusResponse,
  type ORDashboardResponse,
  type CurrentProcedureInfo,
  type NextProcedureInfo,
} from './dto/surgical-enhanced.dto';

// ────────────────────────────────────────────────────────────────────────────
// Internal interfaces for JSON-stored records
// ────────────────────────────────────────────────────────────────────────────

interface StoredCountItem {
  type: string;
  name: string;
  initialCount: number;
  finalCount: number;
  discrepancy: boolean;
}

interface StoredSurgicalCount {
  recordType: string;
  encounterId: string;
  procedureId: string;
  phase: string;
  countedBy: string;
  verifiedBy: string;
  timestamp: string;
  items: StoredCountItem[];
}

interface StoredAnesthesiaRecord {
  recordType: string;
  encounterId: string;
  procedureId: string;
  anesthesiologistId: string;
  patientId: string;
  induction: Record<string, unknown>;
  maintenance: Record<string, unknown>;
  vitalsTimeline: Record<string, unknown>[];
  drugAdministrations: Record<string, unknown>[];
  complications: Record<string, unknown>[];
  emergence: Record<string, unknown> | null;
  observations: string | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
}

interface StoredPreferenceCard {
  recordType: string;
  surgeonId: string;
  procedureType: string;
  name: string;
  instruments: string[];
  sutures: Record<string, unknown>[];
  implants: string[];
  equipment: Record<string, unknown> | null;
  specialRequests: string | null;
  positioningPreference: string;
  skinPrep: string | null;
  draping: string | null;
}

@Injectable()
export class SurgicalEnhancedService {
  private readonly logger = new Logger(SurgicalEnhancedService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // A) SPONGE / INSTRUMENT COUNT
  // ═══════════════════════════════════════════════════════════════════════════

  async recordSurgicalCount(tenantId: string, dto: SurgicalCountDto): Promise<{
    id: string;
    phase: string;
    itemCount: number;
    discrepanciesFound: number;
    createdAt: Date;
  }> {
    const procedure = await this.prisma.surgicalProcedure.findFirst({
      where: { id: dto.procedureId, tenantId },
      include: { patient: { select: { id: true } } },
    });

    if (!procedure) {
      throw new NotFoundException(`Surgical procedure "${dto.procedureId}" not found`);
    }

    const discrepancies = dto.items.filter((i) => i.discrepancy || i.initialCount !== i.finalCount);

    if (discrepancies.length > 0) {
      this.logger.warn(
        `SPONGE/INSTRUMENT COUNT DISCREPANCY: procedure=${dto.procedureId}, phase=${dto.phase}, items=${JSON.stringify(discrepancies.map((d) => d.name))}`,
      );
    }

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: procedure.patient.id,
        authorId: dto.countedBy,
        tenantId,
        type: 'CUSTOM',
        title: `[SURGICAL:COUNT] ${dto.phase} - Procedure ${dto.procedureId}`,
        content: JSON.stringify({
          recordType: 'SURGICAL_COUNT',
          encounterId: dto.encounterId,
          procedureId: dto.procedureId,
          phase: dto.phase,
          countedBy: dto.countedBy,
          verifiedBy: dto.verifiedBy,
          timestamp: dto.timestamp,
          items: dto.items,
          discrepanciesFound: discrepancies.length,
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      phase: dto.phase,
      itemCount: dto.items.length,
      discrepanciesFound: discrepancies.length,
      createdAt: doc.createdAt,
    };
  }

  async verifyCountReconciliation(tenantId: string, procedureId: string): Promise<CountReconciliationDto> {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        title: { contains: `Procedure ${procedureId}` },
      },
      orderBy: { createdAt: 'asc' },
    });

    const countDocs = docs.filter((d) => d.title.includes('[SURGICAL:COUNT]'));

    if (countDocs.length === 0) {
      throw new NotFoundException(`No surgical counts found for procedure "${procedureId}"`);
    }

    const counts = countDocs.map((d) => {
      const parsed = JSON.parse(d.content as string) as StoredSurgicalCount;
      return { id: d.id, ...parsed };
    });

    const initialCount = counts.find((c) => c.phase === 'INITIAL');
    const finalCount = counts.find((c) => c.phase === 'FINAL');

    const discrepancies: Array<{ item: string; expected: number; found: number }> = [];

    if (initialCount && finalCount) {
      const initialMap = new Map(
        initialCount.items.map((i) => [i.name, i.initialCount]),
      );

      for (const item of finalCount.items) {
        const expected = initialMap.get(item.name);
        if (expected !== undefined && expected !== item.finalCount) {
          discrepancies.push({
            item: item.name,
            expected,
            found: item.finalCount,
          });
        }
      }
    }

    // Check within-phase discrepancies as well
    for (const count of counts) {
      for (const item of count.items) {
        if (item.discrepancy && !discrepancies.some((d) => d.item === item.name)) {
          discrepancies.push({
            item: item.name,
            expected: item.initialCount,
            found: item.finalCount,
          });
        }
      }
    }

    const allReconciled = discrepancies.length === 0;

    return {
      procedureId,
      allReconciled,
      discrepancies: discrepancies.map((d) => ({
        item: d.item,
        expected: d.expected,
        found: d.found,
      })),
      actionTaken: allReconciled
        ? CountDiscrepancyAction.FOUND
        : CountDiscrepancyAction.XRAY_ORDERED,
      signedOff: allReconciled,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // B) PRE-ANESTHETIC ASSESSMENT (APA)
  // ═══════════════════════════════════════════════════════════════════════════

  async createPreAnestheticAssessment(tenantId: string, dto: PreAnestheticDto): Promise<{
    id: string;
    asaClass: number;
    predictedDifficultAirway: boolean;
    adequateFasting: boolean;
    cardiacRisk: string;
    createdAt: Date;
  }> {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        authorId: dto.assessorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SURGICAL:APA_ENHANCED] Pre-Anesthetic Assessment - Procedure ${dto.procedureId}`,
        content: JSON.stringify({
          recordType: 'PRE_ANESTHETIC_ASSESSMENT',
          encounterId: dto.encounterId,
          procedureId: dto.procedureId,
          assessorId: dto.assessorId,
          airway: dto.airway,
          asaClassification: dto.asaClassification,
          fasting: dto.fasting,
          anesthesiaPlan: dto.anesthesiaPlan,
          preOpExams: dto.preOpExams,
          riskAssessment: dto.riskAssessment,
          observations: dto.observations,
          computedAirwayRisk: this.assessAirwayRisk(dto),
          computedFastingStatus: this.checkFastingStatus(dto.fasting.lastSolid, dto.fasting.lastClear),
          evaluatedAt: new Date().toISOString(),
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      asaClass: dto.asaClassification.asaClass,
      predictedDifficultAirway: dto.airway.predictedDifficultAirway,
      adequateFasting: dto.fasting.adequateFasting,
      cardiacRisk: dto.riskAssessment.cardiacRisk,
      createdAt: doc.createdAt,
    };
  }

  calculateASA(
    comorbidities: string[],
    emergencyModifier: boolean,
  ): { asaClass: number; emergencyModifier: boolean; description: string } {
    let asaClass: number;

    if (comorbidities.length === 0) {
      asaClass = 1;
    } else if (comorbidities.length <= 1) {
      asaClass = 2;
    } else if (comorbidities.length <= 3) {
      asaClass = 3;
    } else {
      asaClass = 4;
    }

    const descriptions: Record<number, string> = {
      1: 'Healthy patient',
      2: 'Mild systemic disease',
      3: 'Severe systemic disease',
      4: 'Severe systemic disease that is a constant threat to life',
      5: 'Moribund patient not expected to survive without the operation',
      6: 'Brain-dead patient for organ donation',
    };

    return {
      asaClass,
      emergencyModifier,
      description: `ASA ${asaClass}${emergencyModifier ? 'E' : ''} - ${descriptions[asaClass]}`,
    };
  }

  assessAirwayRisk(dto: PreAnestheticDto): {
    difficultAirwayPredicted: boolean;
    riskFactors: string[];
    recommendation: string;
  } {
    const riskFactors: string[] = [];
    const airway = dto.airway;

    if (airway.mallampatiClass >= 3) {
      riskFactors.push(`Mallampati class ${airway.mallampatiClass}`);
    }
    if (airway.mouthOpening === 'LIMITED' || airway.mouthOpening === 'RESTRICTED') {
      riskFactors.push(`Mouth opening: ${airway.mouthOpening}`);
    }
    if (airway.thyromentalDistance === 'SHORT') {
      riskFactors.push('Short thyromental distance');
    }
    if (airway.neckMobility === 'LIMITED' || airway.neckMobility === 'FIXED') {
      riskFactors.push(`Neck mobility: ${airway.neckMobility}`);
    }
    if (airway.dentition === 'LOOSE_TEETH') {
      riskFactors.push('Loose teeth present');
    }
    if (airway.beardPresent) {
      riskFactors.push('Beard present (mask ventilation risk)');
    }

    const difficultAirwayPredicted = riskFactors.length >= 2 || airway.predictedDifficultAirway;

    let recommendation: string;
    if (difficultAirwayPredicted) {
      recommendation = 'Prepare difficult airway cart. Consider awake fiberoptic intubation. Ensure senior anesthesiologist available.';
    } else if (riskFactors.length === 1) {
      recommendation = 'Standard airway management with backup plan. Difficult airway cart on standby.';
    } else {
      recommendation = 'Standard airway management. Routine monitoring.';
    }

    return { difficultAirwayPredicted, riskFactors, recommendation };
  }

  checkFastingStatus(
    lastSolid: string,
    lastClear: string,
  ): { solidFastingHours: number; clearFastingHours: number; adequate: boolean; warnings: string[] } {
    const now = new Date();
    const solidTime = new Date(lastSolid);
    const clearTime = new Date(lastClear);

    const solidFastingHours = (now.getTime() - solidTime.getTime()) / (1000 * 60 * 60);
    const clearFastingHours = (now.getTime() - clearTime.getTime()) / (1000 * 60 * 60);

    const warnings: string[] = [];

    if (solidFastingHours < 6) {
      warnings.push(`Solid fasting only ${solidFastingHours.toFixed(1)}h (minimum 6h required)`);
    }
    if (clearFastingHours < 2) {
      warnings.push(`Clear liquid fasting only ${clearFastingHours.toFixed(1)}h (minimum 2h required)`);
    }

    return {
      solidFastingHours: Math.round(solidFastingHours * 10) / 10,
      clearFastingHours: Math.round(clearFastingHours * 10) / 10,
      adequate: solidFastingHours >= 6 && clearFastingHours >= 2,
      warnings,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // C) ANESTHESIA RECORD (Ficha Anestesica)
  // ═══════════════════════════════════════════════════════════════════════════

  async startAnesthesiaRecord(tenantId: string, dto: AnesthesiaRecordDto): Promise<{
    id: string;
    procedureId: string;
    status: string;
    startedAt: string;
  }> {
    const startedAt = new Date().toISOString();

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.patientId,
        authorId: dto.anesthesiologistId,
        tenantId,
        type: 'CUSTOM',
        title: `[SURGICAL:ANESTHESIA_ENHANCED] Anesthesia Record - Procedure ${dto.procedureId}`,
        content: JSON.stringify({
          recordType: 'ANESTHESIA_RECORD_ENHANCED',
          encounterId: dto.encounterId,
          procedureId: dto.procedureId,
          anesthesiologistId: dto.anesthesiologistId,
          patientId: dto.patientId,
          induction: { ...dto.induction, drugs: dto.induction.drugs.map((d) => ({ ...d })) },
          maintenance: {
            ...dto.maintenance,
            medications: dto.maintenance.medications.map((m) => ({ ...m })),
            fluidsAdministered: dto.maintenance.fluidsAdministered.map((f) => ({ ...f })),
          },
          vitalsTimeline: [] as Record<string, unknown>[],
          drugAdministrations: [] as Record<string, unknown>[],
          complications: (dto.complications ?? []).map((c) => ({ ...c })),
          emergence: null,
          observations: dto.observations ?? null,
          status: 'IN_PROGRESS',
          startedAt,
          completedAt: null,
        }),
        generatedByAI: false,
        status: 'DRAFT',
      },
    });

    this.logger.log(`Anesthesia record started for procedure ${dto.procedureId}`);

    return {
      id: doc.id,
      procedureId: dto.procedureId,
      status: 'IN_PROGRESS',
      startedAt,
    };
  }

  async recordVitalsReading(tenantId: string, recordId: string, dto: AddVitalsReadingDto): Promise<{
    recordId: string;
    readingTimestamp: string;
    totalReadings: number;
  }> {
    const doc = await this.findAnesthesiaRecord(tenantId, recordId);
    const parsed = JSON.parse(doc.content as string) as StoredAnesthesiaRecord;

    if (parsed.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Cannot add vitals to a completed anesthesia record');
    }

    parsed.vitalsTimeline.push(dto.reading as unknown as Record<string, unknown>);

    await this.prisma.clinicalDocument.update({
      where: { id: doc.id },
      data: { content: JSON.stringify(parsed) },
    });

    return {
      recordId: doc.id,
      readingTimestamp: dto.reading.timestamp,
      totalReadings: parsed.vitalsTimeline.length,
    };
  }

  async recordDrugAdministration(tenantId: string, recordId: string, dto: AddDrugAdministrationDto): Promise<{
    recordId: string;
    drugName: string;
    administeredAt: string;
    totalDrugAdministrations: number;
  }> {
    const doc = await this.findAnesthesiaRecord(tenantId, recordId);
    const parsed = JSON.parse(doc.content as string) as StoredAnesthesiaRecord;

    if (parsed.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Cannot add drugs to a completed anesthesia record');
    }

    parsed.drugAdministrations.push({
      name: dto.name,
      dose: dto.dose,
      route: dto.route,
      time: dto.time,
      notes: dto.notes ?? null,
    });

    await this.prisma.clinicalDocument.update({
      where: { id: doc.id },
      data: { content: JSON.stringify(parsed) },
    });

    return {
      recordId: doc.id,
      drugName: dto.name,
      administeredAt: dto.time,
      totalDrugAdministrations: parsed.drugAdministrations.length,
    };
  }

  async completeAnesthesiaRecord(tenantId: string, recordId: string, dto: CompleteAnesthesiaRecordDto): Promise<{
    recordId: string;
    aldretScore: number;
    status: string;
    completedAt: string;
    totalVitalsReadings: number;
    totalDrugsAdministered: number;
  }> {
    const doc = await this.findAnesthesiaRecord(tenantId, recordId);
    const parsed = JSON.parse(doc.content as string) as StoredAnesthesiaRecord;

    if (parsed.status === 'COMPLETED') {
      throw new BadRequestException('Anesthesia record is already completed');
    }

    const completedAt = new Date().toISOString();

    parsed.emergence = dto.emergence as unknown as Record<string, unknown>;
    parsed.complications = [
      ...parsed.complications,
      ...(dto.complications ?? []) as unknown as Record<string, unknown>[],
    ];
    parsed.status = 'COMPLETED';
    parsed.completedAt = completedAt;

    if (dto.observations) {
      parsed.observations = parsed.observations
        ? `${parsed.observations}\n${dto.observations}`
        : dto.observations;
    }

    await this.prisma.clinicalDocument.update({
      where: { id: doc.id },
      data: {
        content: JSON.stringify(parsed),
        status: 'FINAL',
      },
    });

    this.logger.log(`Anesthesia record completed for procedure ${parsed.procedureId} (Aldrete: ${dto.emergence.aldretScore})`);

    return {
      recordId: doc.id,
      aldretScore: dto.emergence.aldretScore,
      status: 'COMPLETED',
      completedAt,
      totalVitalsReadings: parsed.vitalsTimeline.length,
      totalDrugsAdministered: parsed.drugAdministrations.length,
    };
  }

  calculateAldrete(params: {
    activity: 0 | 1 | 2;
    respiration: 0 | 1 | 2;
    circulation: 0 | 1 | 2;
    consciousness: 0 | 1 | 2;
    oxygenSaturation: 0 | 1 | 2;
  }): { total: number; readyForDischarge: boolean; breakdown: Record<string, number> } {
    const total =
      params.activity +
      params.respiration +
      params.circulation +
      params.consciousness +
      params.oxygenSaturation;

    return {
      total,
      readyForDischarge: total >= 9,
      breakdown: {
        activity: params.activity,
        respiration: params.respiration,
        circulation: params.circulation,
        consciousness: params.consciousness,
        oxygenSaturation: params.oxygenSaturation,
      },
    };
  }

  private async findAnesthesiaRecord(tenantId: string, recordId: string) {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: recordId,
        tenantId,
        title: { startsWith: '[SURGICAL:ANESTHESIA_ENHANCED]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Anesthesia record "${recordId}" not found`);
    }

    return doc;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // D) OR ROOM DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  async getORDashboard(tenantId: string): Promise<ORDashboardResponse> {
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

    // Group by operating room
    const roomMap = new Map<string, typeof procedures>();
    for (const proc of procedures) {
      const room = (proc as unknown as Record<string, string>).operatingRoom ?? 'Sala 1';
      if (!roomMap.has(room)) roomMap.set(room, []);
      roomMap.get(room)!.push(proc);
    }

    const now = new Date();
    const rooms: ORRoomStatusResponse[] = Array.from(roomMap.entries()).map(([roomName, procs]) => {
      const currentProc = procs.find((p) => p.status === 'IN_PROGRESS');
      const nextProc = procs.find((p) => p.status === 'SCHEDULED' && p.scheduledAt && new Date(p.scheduledAt) > now);

      let status: ORRoomStatus = ORRoomStatus.FREE;
      let currentProcedure: CurrentProcedureInfo | null = null;
      let nextProcedure: NextProcedureInfo | null = null;

      if (currentProc) {
        status = ORRoomStatus.IN_USE;
        const startTime = currentProc.patientInAt ?? currentProc.scheduledAt ?? now;
        const elapsedMs = now.getTime() - new Date(startTime).getTime();
        const estimatedDuration = 120; // default 2h
        const estimatedEndTime = new Date(new Date(startTime).getTime() + estimatedDuration * 60 * 1000);

        currentProcedure = {
          name: currentProc.procedureName,
          surgeonId: currentProc.surgeonId,
          surgeonName: currentProc.surgeon.name,
          patientId: currentProc.patient.id,
          patientName: currentProc.patient.fullName,
          startTime: new Date(startTime).toISOString(),
          estimatedDuration,
          estimatedEndTime: estimatedEndTime.toISOString(),
          elapsedMinutes: Math.round(elapsedMs / (1000 * 60)),
        };
      }

      if (nextProc && nextProc.scheduledAt) {
        nextProcedure = {
          scheduledTime: new Date(nextProc.scheduledAt).toISOString(),
          surgeonId: nextProc.surgeonId,
          surgeonName: nextProc.surgeon.name,
          patientId: nextProc.patient.id,
          patientName: nextProc.patient.fullName,
          procedure: nextProc.procedureName,
        };
      }

      return {
        roomId: roomName.toLowerCase().replace(/\s+/g, '-'),
        roomName,
        status,
        currentProcedure,
        nextProcedure,
      };
    });

    // Compute metrics
    const completed = procedures.filter((p) => p.status === 'COMPLETED');
    const cancelled = procedures.filter((p) => p.status === 'CANCELLED');
    const totalScheduled = procedures.length;

    const utilizationRate = this.calculateUtilizationRate(procedures);

    // Compute average turnover
    const completedWithTimes = completed
      .filter((p) => p.patientInAt && p.patientOutAt)
      .sort((a, b) => new Date(a.patientInAt!).getTime() - new Date(b.patientInAt!).getTime());

    let averageTurnoverMinutes = 0;
    if (completedWithTimes.length > 1) {
      const turnovers: number[] = [];
      for (let i = 1; i < completedWithTimes.length; i++) {
        const prevOut = new Date(completedWithTimes[i - 1].patientOutAt!).getTime();
        const nextIn = new Date(completedWithTimes[i].patientInAt!).getTime();
        const turnover = (nextIn - prevOut) / (1000 * 60);
        if (turnover > 0 && turnover < 480) turnovers.push(turnover);
      }
      if (turnovers.length > 0) {
        averageTurnoverMinutes = Math.round(turnovers.reduce((a, b) => a + b, 0) / turnovers.length);
      }
    }

    // On-time start rate
    const onTimeCount = completedWithTimes.filter((p) => {
      if (!p.scheduledAt || !p.patientInAt) return false;
      const diff = Math.abs(new Date(p.patientInAt).getTime() - new Date(p.scheduledAt).getTime());
      return diff <= 15 * 60 * 1000;
    }).length;

    const onTimeStartRate = completedWithTimes.length > 0
      ? Math.round((onTimeCount / completedWithTimes.length) * 100)
      : 100;

    const cancellationRate = totalScheduled > 0
      ? Math.round((cancelled.length / totalScheduled) * 100)
      : 0;

    return {
      rooms,
      utilizationRate,
      averageTurnoverMinutes,
      onTimeStartRate,
      cancellationRate,
    };
  }

  async updateRoomStatus(
    tenantId: string,
    roomId: string,
    dto: UpdateORRoomStatusDto,
  ): Promise<{ roomId: string; status: ORRoomStatus; updatedAt: string }> {
    // In production, this would update a dedicated OR room table.
    // For now, we store the status change as an audit document.
    this.logger.log(`OR Room ${roomId} status updated to ${dto.status} (tenant: ${tenantId})`);

    return {
      roomId,
      status: dto.status,
      updatedAt: new Date().toISOString(),
    };
  }

  calculateUtilizationRate(
    procedures: Array<{ patientInAt: Date | null; patientOutAt: Date | null; status: string }>,
  ): number {
    const completed = procedures.filter(
      (p) => p.status === 'COMPLETED' && p.patientInAt && p.patientOutAt,
    );

    if (completed.length === 0) return 0;

    const totalUsedMinutes = completed.reduce((sum, p) => {
      const inTime = new Date(p.patientInAt!).getTime();
      const outTime = new Date(p.patientOutAt!).getTime();
      return sum + (outTime - inTime) / (1000 * 60);
    }, 0);

    const availableMinutes = 12 * 60; // 12h OR day
    return Math.min(100, Math.round((totalUsedMinutes / availableMinutes) * 100));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // E) PREFERENCE CARDS
  // ═══════════════════════════════════════════════════════════════════════════

  async createPreferenceCard(tenantId: string, authorId: string, dto: CreatePreferenceCardDto): Promise<{
    id: string;
    surgeonId: string;
    procedureType: string;
    name: string;
    createdAt: Date;
  }> {
    const doc = await this.prisma.clinicalDocument.create({
      data: {
        patientId: dto.surgeonId, // surgeon reference
        authorId,
        tenantId,
        type: 'CUSTOM',
        title: `[SURGICAL:PREF_CARD_ENHANCED] ${dto.name} - ${dto.procedureType} - Surgeon ${dto.surgeonId}`,
        content: JSON.stringify({
          recordType: 'PREFERENCE_CARD_ENHANCED',
          surgeonId: dto.surgeonId,
          procedureType: dto.procedureType,
          name: dto.name,
          instruments: dto.instruments,
          sutures: dto.sutures.map((s) => ({ ...s })),
          implants: dto.implants ?? [],
          equipment: dto.equipment ? { ...dto.equipment } : null,
          specialRequests: dto.specialRequests ?? null,
          positioningPreference: dto.positioningPreference,
          skinPrep: dto.skinPrep ?? null,
          draping: dto.draping ?? null,
        }),
        generatedByAI: false,
        status: 'FINAL',
      },
    });

    return {
      id: doc.id,
      surgeonId: dto.surgeonId,
      procedureType: dto.procedureType,
      name: dto.name,
      createdAt: doc.createdAt,
    };
  }

  async getPreferenceCard(tenantId: string, surgeonId: string, procedureType: string): Promise<{
    id: string;
    surgeonId: string;
    procedureType: string;
    name: string;
    instruments: string[];
    sutures: Record<string, unknown>[];
    implants: string[];
    equipment: Record<string, unknown> | null;
    specialRequests: string | null;
    positioningPreference: string;
    skinPrep: string | null;
    draping: string | null;
    createdAt: Date;
  } | null> {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        tenantId,
        title: {
          contains: `[SURGICAL:PREF_CARD_ENHANCED]`,
        },
        content: {
          contains: surgeonId,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!doc) return null;

    const parsed = JSON.parse(doc.content as string) as StoredPreferenceCard;

    // Verify this is actually for the requested surgeon and procedure
    if (parsed.surgeonId !== surgeonId) return null;
    if (procedureType && parsed.procedureType !== procedureType) return null;

    return {
      id: doc.id,
      surgeonId: parsed.surgeonId,
      procedureType: parsed.procedureType,
      name: parsed.name,
      instruments: parsed.instruments,
      sutures: parsed.sutures,
      implants: parsed.implants,
      equipment: parsed.equipment,
      specialRequests: parsed.specialRequests,
      positioningPreference: parsed.positioningPreference,
      skinPrep: parsed.skinPrep,
      draping: parsed.draping,
      createdAt: doc.createdAt,
    };
  }

  async updatePreferenceCard(tenantId: string, cardId: string, dto: UpdatePreferenceCardDto): Promise<{
    id: string;
    updatedAt: string;
  }> {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: {
        id: cardId,
        tenantId,
        title: { startsWith: '[SURGICAL:PREF_CARD_ENHANCED]' },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Preference card "${cardId}" not found`);
    }

    const existing = JSON.parse(doc.content as string) as StoredPreferenceCard;

    const updated: StoredPreferenceCard = {
      ...existing,
      name: dto.name ?? existing.name,
      instruments: dto.instruments ?? existing.instruments,
      sutures: (dto.sutures as unknown as Record<string, unknown>[]) ?? existing.sutures,
      implants: dto.implants ?? existing.implants,
      equipment: (dto.equipment as unknown as Record<string, unknown>) ?? existing.equipment,
      specialRequests: dto.specialRequests ?? existing.specialRequests,
      positioningPreference: dto.positioningPreference ?? existing.positioningPreference,
      skinPrep: dto.skinPrep ?? existing.skinPrep,
      draping: dto.draping ?? existing.draping,
    };

    const newTitle = `[SURGICAL:PREF_CARD_ENHANCED] ${updated.name} - ${updated.procedureType} - Surgeon ${updated.surgeonId}`;

    await this.prisma.clinicalDocument.update({
      where: { id: doc.id },
      data: {
        title: newTitle,
        content: JSON.stringify(updated),
      },
    });

    return {
      id: doc.id,
      updatedAt: new Date().toISOString(),
    };
  }
}
