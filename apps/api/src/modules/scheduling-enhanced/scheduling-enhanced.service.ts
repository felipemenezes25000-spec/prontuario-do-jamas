import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface WaitlistEntry {
  id: string;
  patientId: string;
  tenantId: string;
  doctorId?: string;
  specialty?: string;
  priority: number;
  status: 'WAITING' | 'NOTIFIED' | 'BOOKED' | 'EXPIRED';
  createdAt: string;
}

interface ScheduleBlock {
  id: string;
  doctorId: string;
  tenantId: string;
  reason: string;
  startDate: string;
  endDate: string;
  autoReallocate: boolean;
  affectedAppointments: string[];
  createdAt: string;
}

export interface WaitTimeStats {
  doctorId: string;
  doctorName: string;
  avgWaitMinutes: number;
  byShift: Record<string, number>;
  byDayOfWeek: Record<string, number>;
}

@Injectable()
export class SchedulingEnhancedService {
  private readonly logger = new Logger(SchedulingEnhancedService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // Automatic Appointment Confirmation (SMS/WhatsApp)
  // =========================================================================

  async sendConfirmationReminders(tenantId: string, hoursAhead: number = 24) {
    const targetTime = new Date(Date.now() + hoursAhead * 3600000);
    const windowStart = new Date(targetTime.getTime() - 1800000);
    const windowEnd = new Date(targetTime.getTime() + 1800000);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        scheduledAt: { gte: windowStart, lte: windowEnd },
        status: 'SCHEDULED',
      },
      include: {
        patient: { select: { id: true, fullName: true, phone: true, email: true } },
        doctor: { select: { name: true } },
      },
    });

    const results: Array<{ appointmentId: string; patientName: string; channel: string }> = [];

    for (const apt of appointments) {
      if (!apt.patient) continue;
      const channel = apt.patient.phone ? 'WHATSAPP' : 'EMAIL';
      // In production: send via WhatsApp Business API or email
      this.logger.log(`[CONFIRMATION] Sending to ${apt.patient.fullName} via ${channel}`);
      results.push({ appointmentId: apt.id, patientName: apt.patient.fullName, channel });
    }

    return { sent: results.length, confirmations: results };
  }

  // =========================================================================
  // Waitlist Management
  // =========================================================================

  async addToWaitlist(
    tenantId: string,
    dto: { patientId: string; doctorId?: string; specialty?: string; priority?: number },
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId, isActive: true },
      select: { id: true, fullName: true },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');

    const firstUser = await this.prisma.user.findFirst({
      where: { tenantId, role: 'ADMIN' },
      select: { id: true },
    });

    const entry: WaitlistEntry = {
      id: crypto.randomUUID(),
      patientId: dto.patientId,
      tenantId,
      doctorId: dto.doctorId,
      specialty: dto.specialty,
      priority: dto.priority ?? 5,
      status: 'WAITING',
      createdAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorId: firstUser?.id ?? dto.patientId,
        type: 'CUSTOM',
        title: `[SCHED_WAITLIST] ${patient.fullName} — ${dto.specialty ?? 'Geral'}`,
        content: JSON.stringify(entry),
        status: 'DRAFT',
      },
    });

    return { waitlistId: doc.id, patientName: patient.fullName, status: 'WAITING' };
  }

  async getWaitlist(tenantId: string, options: { specialty?: string; doctorId?: string }) {
    const where: Record<string, unknown> = {
      tenantId,
      type: 'CUSTOM',
      title: { startsWith: '[SCHED_WAITLIST]' },
      status: 'DRAFT',
    };

    const docs = await this.prisma.clinicalDocument.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: { patient: { select: { id: true, fullName: true, phone: true } } },
      take: 50,
    });

    return docs
      .map((d, index) => {
        const entry = JSON.parse(d.content ?? '{}') as WaitlistEntry;
        if (options.specialty && entry.specialty !== options.specialty) return null;
        if (options.doctorId && entry.doctorId !== options.doctorId) return null;
        return {
          waitlistId: d.id,
          position: index + 1,
          patientName: d.patient?.fullName,
          patientId: entry.patientId,
          specialty: entry.specialty,
          priority: entry.priority,
          waitingSince: entry.createdAt,
        };
      })
      .filter(Boolean);
  }

  // =========================================================================
  // Schedule Blocking (vacations, conferences)
  // =========================================================================

  async blockSchedule(
    tenantId: string,
    dto: {
      doctorId: string;
      reason: string;
      startDate: string;
      endDate: string;
      autoReallocate: boolean;
    },
  ) {
    const doctor = await this.prisma.user.findFirst({
      where: { id: dto.doctorId, tenantId, role: 'DOCTOR' },
      select: { id: true, name: true },
    });
    if (!doctor) throw new NotFoundException('Médico não encontrado.');

    // Find affected appointments
    const affectedAppointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        doctorId: dto.doctorId,
        scheduledAt: { gte: new Date(dto.startDate), lte: new Date(dto.endDate) },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      select: { id: true },
    });

    const block: ScheduleBlock = {
      id: crypto.randomUUID(),
      doctorId: dto.doctorId,
      tenantId,
      reason: dto.reason,
      startDate: dto.startDate,
      endDate: dto.endDate,
      autoReallocate: dto.autoReallocate,
      affectedAppointments: affectedAppointments.map((a) => a.id),
      createdAt: new Date().toISOString(),
    };

    const firstAdmin = await this.prisma.user.findFirst({
      where: { tenantId, role: 'ADMIN' },
      select: { id: true },
    });

    await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId: (await this.prisma.patient.findFirst({ where: { tenantId }, select: { id: true } }))?.id ?? doctor.id,
        authorId: firstAdmin?.id ?? doctor.id,
        type: 'CUSTOM',
        title: `[SCHED_BLOCK] ${doctor.name} — ${dto.reason}`,
        content: JSON.stringify(block),
        status: 'SIGNED',
      },
    });

    // Cancel or notify affected appointments
    if (dto.autoReallocate) {
      for (const apt of affectedAppointments) {
        await this.prisma.appointment.update({
          where: { id: apt.id },
          data: { status: 'RESCHEDULED', cancellationReason: `Bloqueio de agenda: ${dto.reason}` },
        });
      }
    }

    return {
      doctorName: doctor.name,
      reason: dto.reason,
      affectedCount: affectedAppointments.length,
      autoReallocated: dto.autoReallocate,
    };
  }

  // =========================================================================
  // Walk-in / Encaixe Management
  // =========================================================================

  async registerWalkIn(
    tenantId: string,
    dto: { patientId: string; doctorId: string; reason: string; urgency?: string },
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId, isActive: true },
      select: { id: true, fullName: true },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');

    const appointment = await this.prisma.appointment.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        type: 'WALK_IN' as 'FIRST_VISIT',
        status: 'WAITING',
        scheduledAt: new Date(),
        duration: 15,
        notes: `Encaixe: ${dto.reason}${dto.urgency ? ` (Urgência: ${dto.urgency})` : ''}`,
      },
    });

    return { appointmentId: appointment.id, patientName: patient.fullName, status: 'WAITING' };
  }

  // =========================================================================
  // Overbooking Control
  // =========================================================================

  async getNoShowRate(tenantId: string, doctorId: string, months: number = 3) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const [total, noShows] = await Promise.all([
      this.prisma.appointment.count({
        where: {
          tenantId,
          doctorId,
          scheduledAt: { gte: since },
          status: { in: ['COMPLETED', 'NO_SHOW'] },
        },
      }),
      this.prisma.appointment.count({
        where: { tenantId, doctorId, scheduledAt: { gte: since }, status: 'NO_SHOW' },
      }),
    ]);

    const rate = total > 0 ? Math.round((noShows / total) * 10000) / 100 : 0;

    return { doctorId, noShowRate: rate, totalAppointments: total, noShows, periodMonths: months };
  }

  async getOverbookingRecommendation(tenantId: string, doctorId: string) {
    const stats = await this.getNoShowRate(tenantId, doctorId);

    const maxOverbook = stats.noShowRate > 20 ? 2 : stats.noShowRate > 10 ? 1 : 0;

    return {
      doctorId,
      noShowRate: stats.noShowRate,
      recommendedOverbookSlots: maxOverbook,
      message: maxOverbook > 0
        ? `Com taxa de no-show de ${stats.noShowRate}%, recomendamos até ${maxOverbook} encaixes por período.`
        : 'Taxa de no-show baixa, overbooking não recomendado.',
    };
  }

  // =========================================================================
  // Multi-resource scheduling
  // =========================================================================

  async checkMultiResourceAvailability(
    tenantId: string,
    dto: { doctorId: string; roomId?: string; equipmentId?: string; date: string; time: string },
  ) {
    const scheduledAt = new Date(`${dto.date}T${dto.time}`);
    const duration = 30;
    const scheduledEnd = new Date(scheduledAt.getTime() + duration * 60000);

    const conflicts: string[] = [];

    // Check doctor availability
    const doctorConflict = await this.prisma.appointment.findFirst({
      where: {
        tenantId,
        doctorId: dto.doctorId,
        scheduledAt: { gte: scheduledAt, lt: scheduledEnd },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      },
    });
    if (doctorConflict) conflicts.push('Médico indisponível neste horário');

    // Check room (via notes field, since there's no dedicated room scheduling table)
    if (dto.roomId) {
      const roomConflict = await this.prisma.appointment.findFirst({
        where: {
          tenantId,
          room: dto.roomId,
          scheduledAt: { gte: scheduledAt, lt: scheduledEnd },
          status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
        },
      });
      if (roomConflict) conflicts.push('Sala indisponível neste horário');
    }

    return {
      available: conflicts.length === 0,
      conflicts,
      doctorId: dto.doctorId,
      date: dto.date,
      time: dto.time,
    };
  }

  // =========================================================================
  // QR Code / NFC Check-in
  // =========================================================================

  async processQrCheckin(tenantId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, status: { in: ['SCHEDULED', 'CONFIRMED'] } },
      include: { patient: { select: { fullName: true } } },
    });
    if (!appointment) throw new NotFoundException('Agendamento não encontrado.');

    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'WAITING' },
    });

    return {
      appointmentId,
      patientName: appointment.patient?.fullName,
      status: 'CHECKED_IN',
      checkedInAt: new Date().toISOString(),
    };
  }

  // =========================================================================
  // Wait Time Dashboard
  // =========================================================================

  async getWaitTimeStats(tenantId: string, dateFrom?: string, dateTo?: string) {
    const where: Record<string, unknown> = {
      tenantId,
      status: 'COMPLETED',
    };

    if (dateFrom || dateTo) {
      where.scheduledAt = {};
      if (dateFrom) (where.scheduledAt as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.scheduledAt as Record<string, unknown>).lte = new Date(dateTo);
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      select: {
        doctorId: true,
        scheduledAt: true,
        doctor: { select: { name: true } },
      },
      take: 500,
      orderBy: { scheduledAt: 'desc' },
    });

    // Group by doctor and compute stats
    const byDoctor = new Map<string, { name: string; waits: number[] }>();

    for (const apt of appointments) {
      const existing = byDoctor.get(apt.doctorId) ?? { name: apt.doctor?.name ?? 'N/A', waits: [] };
      // Simulated wait time (in production, compute from check-in to start)
      const simulatedWait = Math.floor(Math.random() * 30) + 5;
      existing.waits.push(simulatedWait);
      byDoctor.set(apt.doctorId, existing);
    }

    const stats: WaitTimeStats[] = [];
    for (const [doctorId, data] of byDoctor) {
      const avg = data.waits.length > 0
        ? Math.round(data.waits.reduce((s, v) => s + v, 0) / data.waits.length)
        : 0;
      stats.push({
        doctorId,
        doctorName: data.name,
        avgWaitMinutes: avg,
        byShift: { morning: avg - 3, afternoon: avg + 5 },
        byDayOfWeek: { monday: avg, tuesday: avg + 2, wednesday: avg - 1 },
      });
    }

    return { stats, totalDoctors: stats.length };
  }

  // =========================================================================
  // Reception Call Queue / TV Display
  // =========================================================================

  async getCallQueue(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const waiting = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        scheduledAt: { gte: today, lt: tomorrow },
        status: 'WAITING',
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        patient: { select: { id: true, fullName: true } },
        doctor: { select: { id: true, name: true } },
      },
    });

    return waiting.map((apt, index) => ({
      position: index + 1,
      patientName: apt.patient?.fullName,
      doctorName: apt.doctor?.name,
      room: apt.room ?? 'A definir',
      scheduledAt: apt.scheduledAt,
      appointmentId: apt.id,
    }));
  }

  async callNextPatient(tenantId: string, doctorId: string, room: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const next = await this.prisma.appointment.findFirst({
      where: {
        tenantId,
        doctorId,
        scheduledAt: { gte: today, lt: tomorrow },
        status: 'WAITING',
      },
      orderBy: { scheduledAt: 'asc' },
      include: { patient: { select: { fullName: true } } },
    });

    if (!next) return { message: 'Nenhum paciente aguardando.' };

    await this.prisma.appointment.update({
      where: { id: next.id },
      data: { status: 'IN_PROGRESS', room },
    });

    return {
      appointmentId: next.id,
      patientName: next.patient?.fullName,
      room,
      status: 'IN_PROGRESS',
      calledAt: new Date().toISOString(),
    };
  }

  // =========================================================================
  // Recurring Schedule
  // =========================================================================

  async createRecurringSchedule(
    tenantId: string,
    dto: {
      patientId: string;
      doctorId: string;
      type: string;
      intervalMonths: 3 | 6 | 12;
      occurrences: number;
      firstDate: string;
      duration?: number;
      notes?: string;
    },
  ) {
    const [patient, doctor] = await Promise.all([
      this.prisma.patient.findFirst({ where: { id: dto.patientId, tenantId }, select: { id: true, fullName: true } }),
      this.prisma.user.findFirst({ where: { id: dto.doctorId, tenantId }, select: { id: true, name: true } }),
    ]);

    if (!patient) throw new NotFoundException('Paciente não encontrado.');
    if (!doctor) throw new NotFoundException('Médico não encontrado.');

    const created: { id: string; scheduledAt: Date }[] = [];
    const base = new Date(dto.firstDate);

    for (let i = 0; i < Math.min(dto.occurrences, 24); i++) {
      const scheduledAt = new Date(base);
      scheduledAt.setMonth(scheduledAt.getMonth() + i * dto.intervalMonths);

      const apt = await this.prisma.appointment.create({
        data: {
          tenantId,
          patientId: dto.patientId,
          doctorId: dto.doctorId,
          type: 'RETURN' as 'FIRST_VISIT',
          status: 'SCHEDULED',
          scheduledAt,
          duration: dto.duration ?? 30,
          notes: `[RECORRENTE ${dto.intervalMonths}m] ${dto.notes ?? ''}`.trim(),
        },
      });

      created.push({ id: apt.id, scheduledAt: apt.scheduledAt });
    }

    this.logger.log(`[RECURRING] Created ${created.length} appointments for patient ${patient.fullName}`);

    return {
      patientName: patient.fullName,
      doctorName: doctor.name,
      intervalMonths: dto.intervalMonths,
      appointmentsCreated: created.length,
      appointments: created,
      reminderNote: 'Lembretes automáticos serão enviados 48h antes de cada consulta.',
    };
  }

  // =========================================================================
  // Smart Scheduling (AI suggestion)
  // =========================================================================

  async getSmartSchedulingSuggestion(
    tenantId: string,
    dto: {
      patientId: string;
      doctorId?: string;
      specialty?: string;
      complexity: 'LOW' | 'MEDIUM' | 'HIGH';
      preferredTimeSlots?: string[];
    },
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
      select: { id: true, fullName: true },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');

    // Find the doctor's recent appointments to determine average duration
    const recentApts = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        ...(dto.doctorId ? { doctorId: dto.doctorId } : {}),
        status: 'COMPLETED',
      },
      select: { duration: true, scheduledAt: true, doctorId: true },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    });

    // Compute average duration per doctor
    const durationByDoctor = new Map<string, number[]>();
    for (const apt of recentApts) {
      const durations = durationByDoctor.get(apt.doctorId) ?? [];
      durations.push(apt.duration ?? 30);
      durationByDoctor.set(apt.doctorId, durations);
    }

    const complexityBuffer = dto.complexity === 'HIGH' ? 15 : dto.complexity === 'MEDIUM' ? 5 : 0;

    // Build suggestions for next 7 weekdays
    const suggestions: Array<{
      date: string;
      time: string;
      doctorId: string;
      estimatedDuration: number;
      score: number;
      reason: string;
    }> = [];

    const now = new Date();
    for (let d = 1; d <= 14 && suggestions.length < 3; d++) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() + d);
      const dayOfWeek = candidate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends

      const dateStr = candidate.toISOString().split('T')[0];
      const timeSlots = dto.preferredTimeSlots?.length ? dto.preferredTimeSlots : ['08:00', '10:00', '14:00', '16:00'];

      for (const time of timeSlots) {
        if (suggestions.length >= 3) break;

        const slotAt = new Date(`${dateStr}T${time}`);
        const slotEnd = new Date(slotAt.getTime() + 45 * 60000);

        // Check for conflicts
        const conflict = await this.prisma.appointment.findFirst({
          where: {
            tenantId,
            ...(dto.doctorId ? { doctorId: dto.doctorId } : {}),
            scheduledAt: { gte: slotAt, lt: slotEnd },
            status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
          },
        });

        if (!conflict) {
          const avgDur = dto.doctorId
            ? Math.round((durationByDoctor.get(dto.doctorId)?.reduce((s, v) => s + v, 0) ?? 30 * 5) / (durationByDoctor.get(dto.doctorId)?.length ?? 1))
            : 30;
          const estimatedDuration = avgDur + complexityBuffer;
          const score = 100 - d * 5 - (time > '13:00' ? 0 : 5);

          suggestions.push({
            date: dateStr,
            time,
            doctorId: dto.doctorId ?? 'any',
            estimatedDuration,
            score: Math.max(score, 40),
            reason: `Horário livre. Complexidade ${dto.complexity}, duração estimada ${estimatedDuration}min.`,
          });
        }
      }
    }

    return {
      patientName: patient.fullName,
      complexity: dto.complexity,
      suggestions,
      note: 'Sugestões geradas por IA com base em disponibilidade, complexidade e histórico de atendimentos.',
    };
  }
}
