import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AutoConfirmationDto,
  SendConfirmationDto,
  ProcessConfirmationResponseDto,
  WaitlistDto,
  RecurringAppointmentDto,
  CreateRecurringDto,
  AgendaBlockDto,
  QueueCallDto,
  CallPatientDto,
  WalkInDto,
  RegisterWalkInDto,
  WalkInUrgency,
  OverbookingDto,
  OverbookingConfigDto,
  MultiResourceDto,
  CheckMultiResourceDto,
  QrCheckinDto,
  ProcessQrCheckinDto,
  GenerateQrCheckinDto,
  WaitTimeDashboardDto,
  DoctorWaitAverageDto,
  ShiftWaitAverageDto,
  WeekdayWaitAverageDto,
} from './dto/scheduling-advanced.dto';

// ── Internal store types ─────────────────────────────────────────────────────

export interface StoredConfirmation extends AutoConfirmationDto {
  tenantId: string;
}

export interface StoredWaitlist extends WaitlistDto {
  id: string;
  tenantId: string;
}

export interface StoredRecurring extends RecurringAppointmentDto {
  id: string;
  tenantId: string;
  generatedDates: string[];
}

export interface StoredBlock extends AgendaBlockDto {
  id: string;
  tenantId: string;
}

export interface StoredQueueCall extends QueueCallDto {
  id: string;
  tenantId: string;
  calledAt: string;
}

export interface StoredWalkIn extends WalkInDto {
  id: string;
  tenantId: string;
}

export interface StoredQrToken {
  appointmentId: string;
  tenantId: string;
  patientId: string;
  qrCode: string;
  generatedAt: string;
  usedAt: string | null;
}

export interface WaitTimeRecord {
  tenantId: string;
  doctorId: string;
  doctorName: string;
  shift: 'morning' | 'afternoon' | 'evening';
  weekday: number;
  waitMinutes: number;
  recordedAt: string;
}

@Injectable()
export class SchedulingAdvancedService {
  private readonly logger = new Logger(SchedulingAdvancedService.name);

  // In-memory stores (production: dedicated Prisma models)
  private confirmations: StoredConfirmation[] = [];
  private waitlist: StoredWaitlist[] = [];
  private recurring: StoredRecurring[] = [];
  private blocks: StoredBlock[] = [];
  private queue: StoredQueueCall[] = [];
  private walkIns: StoredWalkIn[] = [];
  private qrTokens: StoredQrToken[] = [];
  private waitTimeRecords: WaitTimeRecord[] = [];
  private queueCounter = 0;

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Auto-Confirmation (SMS / WhatsApp / Push 24–48h before)
  // ═══════════════════════════════════════════════════════════════════════════

  async sendConfirmation(tenantId: string, dto: SendConfirmationDto): Promise<AutoConfirmationDto> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: dto.appointmentId, tenantId },
    });
    if (!appointment) {
      throw new NotFoundException(`Appointment "${dto.appointmentId}" not found`);
    }

    const existing = this.confirmations.find(
      (c) => c.tenantId === tenantId && c.appointmentId === dto.appointmentId && c.channel === dto.channel,
    );
    if (existing) {
      throw new BadRequestException(`Confirmation already sent via ${dto.channel} for this appointment`);
    }

    const record: StoredConfirmation = {
      tenantId,
      appointmentId: dto.appointmentId,
      channel: dto.channel,
      sentAt: new Date().toISOString(),
      confirmedAt: null,
      response: null,
    };

    this.confirmations.push(record);
    this.logger.log(`[Tenant ${tenantId}] Confirmation sent via ${dto.channel} for appointment ${dto.appointmentId}`);

    return this.stripTenantId(record);
  }

  async processConfirmationResponse(tenantId: string, dto: ProcessConfirmationResponseDto): Promise<AutoConfirmationDto> {
    const record = this.confirmations.find(
      (c) => c.tenantId === tenantId && c.appointmentId === dto.appointmentId,
    );
    if (!record) {
      throw new NotFoundException(`Confirmation for appointment "${dto.appointmentId}" not found`);
    }

    record.response = dto.response;
    record.confirmedAt = new Date().toISOString();

    this.logger.log(`[Tenant ${tenantId}] Patient responded "${dto.response}" for appointment ${dto.appointmentId}`);
    return this.stripTenantId(record);
  }

  async listConfirmations(tenantId: string, appointmentId?: string): Promise<AutoConfirmationDto[]> {
    return this.confirmations
      .filter((c) => c.tenantId === tenantId && (!appointmentId || c.appointmentId === appointmentId))
      .map((c) => this.stripTenantId(c));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Waitlist Management (Advanced)
  // ═══════════════════════════════════════════════════════════════════════════

  async addToAdvancedWaitlist(tenantId: string, dto: WaitlistDto): Promise<StoredWaitlist> {
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId } });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    const duplicate = this.waitlist.find(
      (w) => w.tenantId === tenantId && w.patientId === dto.patientId && w.specialty === dto.specialty,
    );
    if (duplicate) {
      throw new BadRequestException(`Patient already on waitlist for ${dto.specialty}`);
    }

    const entry: StoredWaitlist = {
      ...dto,
      id: crypto.randomUUID(),
      tenantId,
      notifiedAt: null,
      slotOffered: null,
    };

    this.waitlist.push(entry);
    return entry;
  }

  async notifyWaitlistSlot(tenantId: string, entryId: string, slotDatetime: string): Promise<StoredWaitlist> {
    const entry = this.waitlist.find((w) => w.tenantId === tenantId && w.id === entryId);
    if (!entry) throw new NotFoundException(`Waitlist entry "${entryId}" not found`);

    entry.notifiedAt = new Date().toISOString();
    entry.slotOffered = slotDatetime;
    return entry;
  }

  async removeFromAdvancedWaitlist(tenantId: string, entryId: string): Promise<{ removed: boolean }> {
    const idx = this.waitlist.findIndex((w) => w.tenantId === tenantId && w.id === entryId);
    if (idx === -1) throw new NotFoundException(`Waitlist entry "${entryId}" not found`);
    this.waitlist.splice(idx, 1);
    return { removed: true };
  }

  async getAdvancedWaitlist(tenantId: string, specialty?: string): Promise<StoredWaitlist[]> {
    return this.waitlist
      .filter((w) => w.tenantId === tenantId && (!specialty || w.specialty === specialty))
      .sort((a, b) => a.priority - b.priority || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Recurring Appointments (3/6/12 months)
  // ═══════════════════════════════════════════════════════════════════════════

  async createRecurring(tenantId: string, dto: CreateRecurringDto): Promise<StoredRecurring> {
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient "${dto.patientId}" not found`);

    const generatedDates = this.generateRecurringDates(dto.startDate, dto.intervalMonths, 4);

    const record: StoredRecurring = {
      ...dto,
      id: crypto.randomUUID(),
      tenantId,
      generatedDates,
    };

    this.recurring.push(record);
    this.logger.log(`[Tenant ${tenantId}] Recurring series created: ${dto.intervalMonths}m for patient ${dto.patientId}`);
    return record;
  }

  async listRecurring(tenantId: string, patientId?: string): Promise<StoredRecurring[]> {
    return this.recurring.filter(
      (r) => r.tenantId === tenantId && (!patientId || r.patientId === patientId),
    );
  }

  async cancelRecurring(tenantId: string, recurringId: string): Promise<{ cancelled: boolean }> {
    const idx = this.recurring.findIndex((r) => r.tenantId === tenantId && r.id === recurringId);
    if (idx === -1) throw new NotFoundException(`Recurring series "${recurringId}" not found`);

    this.recurring.splice(idx, 1);
    return { cancelled: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Agenda Blocking (vacations, conferences) + reallocation
  // ═══════════════════════════════════════════════════════════════════════════

  async blockAgenda(tenantId: string, dto: AgendaBlockDto): Promise<StoredBlock> {
    const conflict = this.blocks.find(
      (b) =>
        b.tenantId === tenantId &&
        b.doctorId === dto.doctorId &&
        new Date(b.startDate) < new Date(dto.endDate) &&
        new Date(b.endDate) > new Date(dto.startDate),
    );
    if (conflict) {
      throw new BadRequestException(`Doctor already has a block overlapping the requested period`);
    }

    const block: StoredBlock = {
      ...dto,
      id: crypto.randomUUID(),
      tenantId,
    };

    this.blocks.push(block);

    if (dto.autoReallocatePatients) {
      this.logger.log(
        `[Tenant ${tenantId}] Auto-reallocation triggered for doctor ${dto.doctorId} block ${block.id}`,
      );
      // Production: query appointments in date range, reassign or notify patients
    }

    return block;
  }

  async listBlocks(tenantId: string, doctorId?: string): Promise<StoredBlock[]> {
    return this.blocks.filter(
      (b) => b.tenantId === tenantId && (!doctorId || b.doctorId === doctorId),
    );
  }

  async removeBlock(tenantId: string, blockId: string): Promise<{ removed: boolean }> {
    const idx = this.blocks.findIndex((b) => b.tenantId === tenantId && b.id === blockId);
    if (idx === -1) throw new NotFoundException(`Block "${blockId}" not found`);
    this.blocks.splice(idx, 1);
    return { removed: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Queue Management / TV Panel
  // ═══════════════════════════════════════════════════════════════════════════

  async callPatient(tenantId: string, dto: CallPatientDto): Promise<StoredQueueCall> {
    this.queueCounter += 1;
    const call: StoredQueueCall = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      queueNumber: this.queueCounter,
      tvPanelDisplay: true,
      calledBy: dto.calledBy,
      room: dto.room,
      waitTimeMinutes: 0,
      calledAt: new Date().toISOString(),
    };

    this.queue.push(call);
    this.logger.log(`[Tenant ${tenantId}] Queue call #${call.queueNumber} → patient ${dto.patientId} → room ${dto.room}`);
    return call;
  }

  async listQueueCalls(tenantId: string, date?: string): Promise<StoredQueueCall[]> {
    const today = date ?? new Date().toISOString().substring(0, 10);
    return this.queue
      .filter((c) => c.tenantId === tenantId && c.calledAt.startsWith(today))
      .sort((a, b) => a.queueNumber - b.queueNumber);
  }

  async getQueueStatus(tenantId: string): Promise<{ pending: number; called: number; currentNumber: number }> {
    const todayPrefix = new Date().toISOString().substring(0, 10);
    const todayCalls = this.queue.filter((c) => c.tenantId === tenantId && c.calledAt.startsWith(todayPrefix));
    const pendingWalkIns = this.walkIns.filter(
      (w) => w.tenantId === tenantId && w.arrivalTime.startsWith(todayPrefix),
    );

    return {
      pending: pendingWalkIns.length,
      called: todayCalls.length,
      currentNumber: this.queueCounter,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Walk-In / Encaixe
  // ═══════════════════════════════════════════════════════════════════════════

  async registerWalkIn(tenantId: string, dto: RegisterWalkInDto): Promise<StoredWalkIn> {
    const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId } });
    if (!patient) throw new NotFoundException(`Patient "${dto.patientId}" not found`);

    const todayPrefix = new Date().toISOString().substring(0, 10);
    const todayWalkIns = this.walkIns.filter(
      (w) => w.tenantId === tenantId && w.arrivalTime.startsWith(todayPrefix),
    );

    const urgencyOrder: Record<WalkInUrgency, number> = {
      [WalkInUrgency.EMERGENCY]: 0,
      [WalkInUrgency.PRIORITY]: 1,
      [WalkInUrgency.ROUTINE]: 2,
    };

    const queuePosition =
      todayWalkIns.filter((w) => urgencyOrder[w.urgency] <= urgencyOrder[dto.urgency]).length + 1;

    const walkIn: StoredWalkIn = {
      id: crypto.randomUUID(),
      tenantId,
      patientId: dto.patientId,
      arrivalTime: new Date().toISOString(),
      urgency: dto.urgency,
      queuePosition,
      assignedDoctor: dto.preferredDoctorId ?? null,
    };

    this.walkIns.push(walkIn);
    return walkIn;
  }

  async listWalkIns(tenantId: string, date?: string): Promise<StoredWalkIn[]> {
    const prefix = date ?? new Date().toISOString().substring(0, 10);
    return this.walkIns
      .filter((w) => w.tenantId === tenantId && w.arrivalTime.startsWith(prefix))
      .sort((a, b) => a.queuePosition - b.queuePosition);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Controlled Overbooking (based on historical no-show rate)
  // ═══════════════════════════════════════════════════════════════════════════

  async calculateOverbooking(tenantId: string, dto: OverbookingConfigDto): Promise<OverbookingDto> {
    // Production: query historical data from Prisma
    const simulatedNoShowRate = 0.15; // 15% historical no-show average
    const allowedOverbook = Math.floor(dto.maxOverbookRatio * simulatedNoShowRate * 100) + 1;

    return {
      doctorId: dto.doctorId,
      date: dto.date,
      maxSlots: 20,
      bookedSlots: 18,
      noShowRate: simulatedNoShowRate,
      allowedOverbook,
    };
  }

  async applyOverbooking(tenantId: string, dto: OverbookingConfigDto): Promise<{ applied: boolean; extraSlots: number }> {
    const result = await this.calculateOverbooking(tenantId, dto);
    this.logger.log(
      `[Tenant ${tenantId}] Overbooking applied for doctor ${dto.doctorId} on ${dto.date}: +${result.allowedOverbook} slots`,
    );
    return { applied: true, extraSlots: result.allowedOverbook };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Multi-Resource Availability (doctor + room + equipment)
  // ═══════════════════════════════════════════════════════════════════════════

  async checkMultiResourceAvailability(tenantId: string, dto: CheckMultiResourceDto): Promise<MultiResourceDto> {
    // Production: query doctor schedules, room bookings, equipment reservations
    const doctorAvailable = true; // stub
    const roomAvailable = dto.roomId == null ? true : true; // stub
    const equipmentAvailable = dto.equipmentId == null ? true : true; // stub

    return {
      doctorId: dto.doctorId,
      roomId: dto.roomId,
      equipmentId: dto.equipmentId,
      date: dto.startDatetime.substring(0, 10),
      allAvailable: doctorAvailable && roomAvailable && equipmentAvailable,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QR Code Auto Check-In
  // ═══════════════════════════════════════════════════════════════════════════

  async generateQrCheckin(tenantId: string, dto: GenerateQrCheckinDto): Promise<{ qrCode: string; expiresAt: string }> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: dto.appointmentId, tenantId },
    });
    if (!appointment) throw new NotFoundException(`Appointment "${dto.appointmentId}" not found`);

    const qrCode = `${tenantId}:${dto.appointmentId}:${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 h

    // Remove previous QR tokens for same appointment
    const idx = this.qrTokens.findIndex(
      (t) => t.tenantId === tenantId && t.appointmentId === dto.appointmentId,
    );
    if (idx !== -1) this.qrTokens.splice(idx, 1);

    this.qrTokens.push({
      appointmentId: dto.appointmentId,
      tenantId,
      patientId: (appointment as unknown as { patientId: string }).patientId ?? '',
      qrCode,
      generatedAt: new Date().toISOString(),
      usedAt: null,
    });

    return { qrCode, expiresAt };
  }

  async processQrCheckin(tenantId: string, dto: ProcessQrCheckinDto): Promise<QrCheckinDto> {
    const token = this.qrTokens.find(
      (t) => t.tenantId === tenantId && t.qrCode === dto.qrCode && t.usedAt === null,
    );
    if (!token) throw new BadRequestException(`Invalid or already-used QR code`);

    token.usedAt = new Date().toISOString();

    // Production: update appointment status → ARRIVED
    this.logger.log(
      `[Tenant ${tenantId}] QR check-in processed for appointment ${token.appointmentId}`,
    );

    return {
      patientId: token.patientId,
      appointmentId: token.appointmentId,
      qrCode: token.qrCode,
      checkinTime: token.usedAt,
      autoStatusUpdate: true,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Wait Time Dashboard
  // ═══════════════════════════════════════════════════════════════════════════

  async recordWaitTime(
    tenantId: string,
    doctorId: string,
    doctorName: string,
    waitMinutes: number,
  ): Promise<void> {
    const now = new Date();
    const hour = now.getHours();
    const shift: WaitTimeRecord['shift'] = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

    this.waitTimeRecords.push({
      tenantId,
      doctorId,
      doctorName,
      shift,
      weekday: now.getDay(),
      waitMinutes,
      recordedAt: now.toISOString(),
    });
  }

  async getWaitTimeDashboard(tenantId: string): Promise<WaitTimeDashboardDto> {
    const records = this.waitTimeRecords.filter((r) => r.tenantId === tenantId);

    const byDoctor = this.groupAverage(records, 'doctorId');
    const averageByDoctor: DoctorWaitAverageDto[] = Object.entries(byDoctor).map(
      ([doctorId, avg]) => ({
        doctorId,
        doctorName: records.find((r) => r.doctorId === doctorId)?.doctorName ?? doctorId,
        averageMinutes: Math.round(avg),
      }),
    );

    const shiftLabels: WaitTimeRecord['shift'][] = ['morning', 'afternoon', 'evening'];
    const averageByShift: ShiftWaitAverageDto[] = shiftLabels.map((shift) => {
      const group = records.filter((r) => r.shift === shift);
      return {
        shift,
        averageMinutes: group.length ? Math.round(group.reduce((s, r) => s + r.waitMinutes, 0) / group.length) : 0,
      };
    });

    const weekdayLabels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const averageByWeekday: WeekdayWaitAverageDto[] = Array.from({ length: 7 }, (_, i) => {
      const group = records.filter((r) => r.weekday === i);
      return {
        weekday: i,
        weekdayLabel: weekdayLabels[i],
        averageMinutes: group.length ? Math.round(group.reduce((s, r) => s + r.waitMinutes, 0) / group.length) : 0,
      };
    });

    const bottlenecks: string[] = [];
    averageByDoctor
      .filter((d) => d.averageMinutes > 30)
      .forEach((d) => bottlenecks.push(`Dr(a). ${d.doctorName} — média ${d.averageMinutes} min`));

    return { averageByDoctor, averageByShift, averageByWeekday, bottlenecks };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════════════════════════════════════════

  private stripTenantId(record: StoredConfirmation): AutoConfirmationDto {
    const { tenantId: _t, ...rest } = record;
    void _t;
    return rest;
  }

  private generateRecurringDates(startDate: string, intervalMonths: number, count: number): string[] {
    const dates: string[] = [];
    const base = new Date(startDate);
    for (let i = 0; i < count; i++) {
      const d = new Date(base);
      d.setMonth(d.getMonth() + intervalMonths * (i + 1));
      dates.push(d.toISOString().substring(0, 10));
    }
    return dates;
  }

  private groupAverage(records: WaitTimeRecord[], key: keyof WaitTimeRecord): Record<string, number> {
    const map: Record<string, { sum: number; count: number }> = {};
    for (const r of records) {
      const k = String(r[key]);
      if (!map[k]) map[k] = { sum: 0, count: 0 };
      map[k].sum += r.waitMinutes;
      map[k].count += 1;
    }
    return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.sum / v.count]));
  }
}
