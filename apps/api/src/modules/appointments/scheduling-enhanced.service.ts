import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AddToWaitlistDto,
  WaitlistEntryDto,
  WaitlistStatus,
  WaitlistUrgency,
  SendReminderDto,
  ProcessReminderResponseDto,
  AppointmentReminderDto,
  ReminderResponse,
  ReminderConfigDto,
  CheckInTokenDto,
  CheckInResultDto,
  ProcessQRCheckInDto,
  QueueStatusDto,
} from './dto/scheduling-enhanced.dto';

@Injectable()
export class SchedulingEnhancedService {
  // In-memory stores (production would use dedicated Prisma models)
  private waitlist: WaitlistEntryDto[] = [];
  private reminders: AppointmentReminderDto[] = [];
  private checkInTokens: (CheckInTokenDto & { tenantId: string })[] = [];
  private checkedIn: (CheckInResultDto & { tenantId: string; doctorId: string | null; specialty: string | null })[] = [];
  private reminderConfig: (ReminderConfigDto & { tenantId: string })[] = [];
  private queueCounter = 0;

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Waitlist
  // ═══════════════════════════════════════════════════════════════════════════

  async addToWaitlist(tenantId: string, dto: AddToWaitlistDto): Promise<WaitlistEntryDto> {
    // Validate patient exists
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${dto.patientId}" not found`);
    }

    // Check for duplicate on same specialty
    const existing = this.waitlist.find(
      (w) =>
        w.tenantId === tenantId &&
        w.patientId === dto.patientId &&
        w.specialty === dto.specialty &&
        (w.status === WaitlistStatus.WAITING || w.status === WaitlistStatus.NOTIFIED),
    );
    if (existing) {
      throw new BadRequestException(
        `Patient is already on the waitlist for ${dto.specialty}`,
      );
    }

    const entry: WaitlistEntryDto = {
      id: crypto.randomUUID(),
      patientId: dto.patientId,
      specialty: dto.specialty,
      preferredDoctorId: dto.preferredDoctorId ?? null,
      preferredDays: dto.preferredDays ?? [],
      preferredTimeSlot: dto.preferredTimeSlot,
      urgency: dto.urgency,
      addedDate: new Date(),
      notifiedDate: null,
      bookedDate: null,
      status: WaitlistStatus.WAITING,
      tenantId,
    };

    this.waitlist.push(entry);
    return entry;
  }

  getWaitlist(tenantId: string, specialty?: string): WaitlistEntryDto[] {
    let entries = this.waitlist.filter(
      (w) => w.tenantId === tenantId && w.status !== WaitlistStatus.CANCELLED,
    );

    if (specialty) {
      entries = entries.filter((w) => w.specialty === specialty);
    }

    // Sort by urgency (URGENT > PRIORITY > ROUTINE), then by addedDate ascending
    const urgencyOrder: Record<WaitlistUrgency, number> = {
      [WaitlistUrgency.URGENT]: 0,
      [WaitlistUrgency.PRIORITY]: 1,
      [WaitlistUrgency.ROUTINE]: 2,
    };

    return entries.sort((a, b) => {
      const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (uDiff !== 0) return uDiff;
      return a.addedDate.getTime() - b.addedDate.getTime();
    });
  }

  async notifyWaitlistPatient(
    tenantId: string,
    entryId: string,
  ): Promise<WaitlistEntryDto> {
    const entry = this.waitlist.find(
      (w) => w.id === entryId && w.tenantId === tenantId,
    );
    if (!entry) {
      throw new NotFoundException(`Waitlist entry "${entryId}" not found`);
    }

    if (entry.status !== WaitlistStatus.WAITING) {
      throw new BadRequestException(
        `Cannot notify — current status is ${entry.status}`,
      );
    }

    entry.status = WaitlistStatus.NOTIFIED;
    entry.notifiedDate = new Date();
    return entry;
  }

  async bookFromWaitlist(
    tenantId: string,
    entryId: string,
  ): Promise<WaitlistEntryDto> {
    const entry = this.waitlist.find(
      (w) => w.id === entryId && w.tenantId === tenantId,
    );
    if (!entry) {
      throw new NotFoundException(`Waitlist entry "${entryId}" not found`);
    }

    if (entry.status !== WaitlistStatus.WAITING && entry.status !== WaitlistStatus.NOTIFIED) {
      throw new BadRequestException(
        `Cannot book — current status is ${entry.status}`,
      );
    }

    entry.status = WaitlistStatus.BOOKED;
    entry.bookedDate = new Date();
    return entry;
  }

  async removeFromWaitlist(
    tenantId: string,
    entryId: string,
  ): Promise<WaitlistEntryDto> {
    const entry = this.waitlist.find(
      (w) => w.id === entryId && w.tenantId === tenantId,
    );
    if (!entry) {
      throw new NotFoundException(`Waitlist entry "${entryId}" not found`);
    }

    entry.status = WaitlistStatus.CANCELLED;
    return entry;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Auto-Confirmation / Reminders
  // ═══════════════════════════════════════════════════════════════════════════

  async sendAppointmentReminder(
    tenantId: string,
    dto: SendReminderDto,
  ): Promise<AppointmentReminderDto> {
    // Validate appointment exists
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: dto.appointmentId, tenantId },
    });
    if (!appointment) {
      throw new NotFoundException(`Appointment "${dto.appointmentId}" not found`);
    }

    const reminder: AppointmentReminderDto = {
      id: crypto.randomUUID(),
      appointmentId: dto.appointmentId,
      patientId: dto.patientId,
      channel: dto.channel,
      sentAt: new Date(),
      response: ReminderResponse.NO_RESPONSE,
      respondedAt: null,
    };

    this.reminders.push(reminder);

    // In production, this would trigger SMS/WhatsApp/email via a message queue
    // For now, we just store the reminder record

    return reminder;
  }

  async processReminderResponse(
    tenantId: string,
    dto: ProcessReminderResponseDto,
  ): Promise<AppointmentReminderDto> {
    const reminder = this.reminders.find(
      (r) => r.appointmentId === dto.appointmentId && r.patientId === dto.patientId,
    );
    if (!reminder) {
      throw new NotFoundException(
        `No reminder found for appointment "${dto.appointmentId}"`,
      );
    }

    reminder.response = dto.response;
    reminder.respondedAt = new Date();

    // If cancelled, update appointment status
    if (dto.response === ReminderResponse.CANCELLED) {
      await this.prisma.appointment.update({
        where: { id: dto.appointmentId },
        data: { status: 'CANCELLED' as never },
      });
    }

    return reminder;
  }

  getNoShowRate(
    _tenantId: string,
    _doctorId?: string,
  ): { total: number; noShows: number; rate: number } {
    const relevantReminders = this.reminders.filter((_r) => {
      // In production, we'd join with appointment table. For now, basic filter.
      return true;
    });

    const totalWithReminders = relevantReminders.length;
    const noShowCount = relevantReminders.filter(
      (r) => r.response === ReminderResponse.NO_RESPONSE,
    ).length;

    return {
      total: totalWithReminders,
      noShows: noShowCount,
      rate: totalWithReminders > 0 ? Math.round((noShowCount / totalWithReminders) * 100) : 0,
    };
  }

  configureReminders(tenantId: string, config: ReminderConfigDto): ReminderConfigDto & { tenantId: string } {
    const existing = this.reminderConfig.findIndex((c) => c.tenantId === tenantId);
    const stored = { ...config, tenantId };

    if (existing >= 0) {
      this.reminderConfig[existing] = stored;
    } else {
      this.reminderConfig.push(stored);
    }

    return stored;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QR Check-in
  // ═══════════════════════════════════════════════════════════════════════════

  async generateCheckInQR(
    tenantId: string,
    appointmentId: string,
  ): Promise<CheckInTokenDto> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId },
    });
    if (!appointment) {
      throw new NotFoundException(`Appointment "${appointmentId}" not found`);
    }

    // Check for already existing token
    const existing = this.checkInTokens.find(
      (t) => t.appointmentId === appointmentId && t.tenantId === tenantId && t.usedAt === null,
    );
    if (existing && existing.expiresAt > new Date()) {
      return existing;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h expiry

    // Generate unique QR token (base64-encoded UUID)
    const rawToken = crypto.randomUUID();
    const qrCode = Buffer.from(`CHECKIN:${appointmentId}:${rawToken}`).toString('base64');

    const token: CheckInTokenDto & { tenantId: string } = {
      appointmentId,
      patientId: appointment.patientId,
      qrCode,
      generatedAt: now,
      expiresAt,
      usedAt: null,
      tenantId,
    };

    this.checkInTokens.push(token);
    return token;
  }

  async processQRCheckIn(
    tenantId: string,
    dto: ProcessQRCheckInDto,
  ): Promise<CheckInResultDto> {
    const token = this.checkInTokens.find(
      (t) => t.qrCode === dto.qrCode && t.tenantId === tenantId,
    );
    if (!token) {
      throw new NotFoundException('Invalid QR code');
    }

    if (token.usedAt !== null) {
      throw new BadRequestException('This QR code has already been used');
    }

    if (token.expiresAt < new Date()) {
      throw new BadRequestException('This QR code has expired');
    }

    // Mark token as used
    token.usedAt = new Date();

    // Update appointment status to checked-in
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: token.appointmentId, tenantId },
    });
    if (!appointment) {
      throw new NotFoundException(`Appointment "${token.appointmentId}" not found`);
    }

    await this.prisma.appointment.update({
      where: { id: token.appointmentId },
      data: { status: 'CHECKED_IN' as never },
    });

    // Assign queue position
    this.queueCounter += 1;

    // Calculate estimated wait based on existing queue
    const currentQueue = this.checkedIn.filter(
      (c) =>
        c.tenantId === tenantId &&
        c.doctorId === appointment.doctorId &&
        c.checkedInAt.toDateString() === new Date().toDateString(),
    );
    const avgConsultMinutes = 20; // estimated average consultation time
    const estimatedWait = currentQueue.length * avgConsultMinutes;

    const result: CheckInResultDto & { tenantId: string; doctorId: string | null; specialty: string | null } = {
      appointmentId: token.appointmentId,
      patientId: token.patientId,
      checkedInAt: new Date(),
      position: this.queueCounter,
      estimatedWaitMinutes: estimatedWait,
      tenantId,
      doctorId: appointment.doctorId,
      specialty: appointment.type ?? null,
    };

    this.checkedIn.push(result);

    return {
      appointmentId: result.appointmentId,
      patientId: result.patientId,
      checkedInAt: result.checkedInAt,
      position: result.position,
      estimatedWaitMinutes: result.estimatedWaitMinutes,
    };
  }

  getQueueStatus(
    tenantId: string,
    doctorId?: string,
    specialty?: string,
    date?: string,
  ): QueueStatusDto {
    const targetDate = date ? new Date(date) : new Date();

    let queue = this.checkedIn.filter(
      (c) =>
        c.tenantId === tenantId &&
        c.checkedInAt.toDateString() === targetDate.toDateString(),
    );

    if (doctorId) {
      queue = queue.filter((c) => c.doctorId === doctorId);
    }
    if (specialty) {
      queue = queue.filter((c) => c.specialty === specialty);
    }

    // Sort by position
    queue.sort((a, b) => a.position - b.position);

    const totalWaiting = queue.length;
    const avgWait =
      totalWaiting > 0
        ? Math.round(
            queue.reduce((sum, c) => sum + c.estimatedWaitMinutes, 0) / totalWaiting,
          )
        : 0;

    return {
      doctorId: doctorId ?? null,
      specialty: specialty ?? null,
      currentPosition: totalWaiting > 0 ? queue[totalWaiting - 1].position : 0,
      totalWaiting,
      averageWaitMinutes: avgWait,
      entries: queue.map((c) => ({
        appointmentId: c.appointmentId,
        patientId: c.patientId,
        position: c.position,
        checkedInAt: c.checkedInAt,
        estimatedWaitMinutes: c.estimatedWaitMinutes,
      })),
    };
  }
}
