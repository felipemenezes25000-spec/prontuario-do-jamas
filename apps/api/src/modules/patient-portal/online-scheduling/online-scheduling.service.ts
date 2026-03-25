import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Specialty } from '@prisma/client';

interface WaitlistEntry {
  id: string;
  patientId: string;
  tenantId: string;
  doctorId?: string;
  specialty?: string;
  preferredDays: number[];
  preferredTimeRange?: { start: string; end: string };
  status: 'WAITING' | 'NOTIFIED' | 'BOOKED' | 'EXPIRED';
  createdAt: string;
  notifiedAt?: string;
}

interface RecurringSchedule {
  id: string;
  patientId: string;
  tenantId: string;
  doctorId: string;
  intervalMonths: number;
  nextDueDate: string;
  type: string;
  notes?: string;
  isActive: boolean;
  history: Array<{ appointmentId: string; scheduledAt: string }>;
  createdAt: string;
}

@Injectable()
export class OnlineSchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolvePatientId(tenantId: string, userEmail: string): Promise<string> {
    const patient = await this.prisma.patient.findFirst({
      where: { tenantId, email: userEmail, isActive: true },
      select: { id: true },
    });
    if (!patient) {
      throw new ForbiddenException('Nenhum registro de paciente vinculado a esta conta.');
    }
    return patient.id;
  }

  async getSpecialties(tenantId: string) {
    const doctors = await this.prisma.user.findMany({
      where: { tenantId, role: 'DOCTOR', isActive: true },
      select: {
        doctorProfile: { select: { specialty: true } },
      },
    });

    const specialties = [...new Set(
      doctors
        .map((d) => d.doctorProfile?.specialty)
        .filter(Boolean) as string[],
    )].sort();

    return { specialties };
  }

  async getDoctorsBySpecialty(tenantId: string, specialty: string) {
    const doctors = await this.prisma.user.findMany({
      where: {
        tenantId,
        role: 'DOCTOR',
        isActive: true,
        doctorProfile: { specialty: specialty as Specialty },
      },
      select: {
        id: true,
        name: true,
        doctorProfile: {
          select: {
            specialty: true,
            consultationDuration: true,
            teleconsultationEnabled: true,
          },
        },
      },
    });

    return { doctors };
  }

  async getAvailableSlots(
    tenantId: string,
    doctorId?: string,
    specialty?: string,
    date?: string,
  ) {
    const doctorWhere: Record<string, unknown> = {
      tenantId,
      role: 'DOCTOR',
      isActive: true,
    };

    if (doctorId) {
      doctorWhere.id = doctorId;
    }
    if (specialty) {
      doctorWhere.doctorProfile = { specialty };
    }

    const doctors = await this.prisma.user.findMany({
      where: doctorWhere,
      select: {
        id: true,
        name: true,
        doctorProfile: {
          select: {
            specialty: true,
            consultationDuration: true,
            teleconsultationEnabled: true,
          },
        },
        schedules: true,
      },
      take: 20,
    });

    const targetDate = date ? new Date(date) : new Date();
    const dayOfWeek = targetDate.getDay();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        scheduledAt: { gte: startOfDay, lte: endOfDay },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'WAITING', 'IN_PROGRESS'] },
        ...(doctorId ? { doctorId } : {}),
      },
      select: { doctorId: true, scheduledAt: true, duration: true },
    });

    const bookedSlots = new Map<string, Date[]>();
    for (const apt of existingAppointments) {
      const existing = bookedSlots.get(apt.doctorId) ?? [];
      existing.push(apt.scheduledAt);
      bookedSlots.set(apt.doctorId, existing);
    }

    const results: Array<{
      doctorId: string;
      doctorName: string;
      specialty: string | null;
      teleconsultationEnabled: boolean;
      slots: Array<{ startTime: string; endTime: string }>;
    }> = [];

    for (const doctor of doctors) {
      const scheduleForDay = doctor.schedules.filter(
        (s) => s.dayOfWeek === dayOfWeek,
      );
      if (scheduleForDay.length === 0) continue;

      const slotDuration =
        doctor.doctorProfile?.consultationDuration ?? 30;
      const doctorBooked = bookedSlots.get(doctor.id) ?? [];

      const slots: Array<{ startTime: string; endTime: string }> = [];

      for (const schedule of scheduleForDay) {
        const [startH, startM] = schedule.startTime.split(':').map(Number);
        const [endH, endM] = schedule.endTime.split(':').map(Number);
        const breakStartParts = schedule.breakStart?.split(':').map(Number);
        const breakEndParts = schedule.breakEnd?.split(':').map(Number);

        let currentMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        while (currentMinutes + slotDuration <= endMinutes) {
          if (breakStartParts && breakEndParts) {
            const breakStart = breakStartParts[0] * 60 + breakStartParts[1];
            const breakEnd = breakEndParts[0] * 60 + breakEndParts[1];
            if (currentMinutes >= breakStart && currentMinutes < breakEnd) {
              currentMinutes = breakEnd;
              continue;
            }
          }

          const slotDate = new Date(targetDate);
          slotDate.setHours(
            Math.floor(currentMinutes / 60),
            currentMinutes % 60,
            0,
            0,
          );

          const isBooked = doctorBooked.some((bookedTime) => {
            const diff = Math.abs(slotDate.getTime() - bookedTime.getTime());
            return diff < slotDuration * 60 * 1000;
          });

          if (!isBooked && slotDate > new Date()) {
            const endSlotMinutes = currentMinutes + slotDuration;
            slots.push({
              startTime: `${String(Math.floor(currentMinutes / 60)).padStart(2, '0')}:${String(currentMinutes % 60).padStart(2, '0')}`,
              endTime: `${String(Math.floor(endSlotMinutes / 60)).padStart(2, '0')}:${String(endSlotMinutes % 60).padStart(2, '0')}`,
            });
          }

          currentMinutes += slotDuration;
        }
      }

      if (slots.length > 0) {
        results.push({
          doctorId: doctor.id,
          doctorName: doctor.name,
          specialty: doctor.doctorProfile?.specialty ?? null,
          teleconsultationEnabled:
            doctor.doctorProfile?.teleconsultationEnabled ?? false,
          slots,
        });
      }
    }

    return { date: targetDate.toISOString().split('T')[0], availableSlots: results };
  }

  async getAvailableDates(
    tenantId: string,
    doctorId: string,
    month: string,
  ) {
    const doctor = await this.prisma.user.findFirst({
      where: { id: doctorId, tenantId, role: 'DOCTOR', isActive: true },
      select: { schedules: true },
    });
    if (!doctor) {
      throw new NotFoundException('Médico não encontrado.');
    }

    const [year, monthNum] = month.split('-').map(Number);
    const scheduledDays = doctor.schedules.map((s) => s.dayOfWeek);

    const availableDates: string[] = [];
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, monthNum - 1, day);
      if (date >= today && scheduledDays.includes(date.getDay())) {
        availableDates.push(date.toISOString().split('T')[0]);
      }
    }

    return { doctorId, month, availableDates };
  }

  async scheduleAppointment(
    tenantId: string,
    userEmail: string,
    dto: {
      doctorId: string;
      scheduledAt: string;
      type?: string;
      isTelemedicine?: boolean;
      notes?: string;
    },
  ) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const doctor = await this.prisma.user.findFirst({
      where: { id: dto.doctorId, tenantId, role: 'DOCTOR', isActive: true },
      select: { id: true, doctorProfile: { select: { consultationDuration: true } } },
    });
    if (!doctor) {
      throw new NotFoundException('Médico não encontrado.');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Horário deve ser no futuro.');
    }

    const duration = doctor.doctorProfile?.consultationDuration ?? 30;
    const conflictEnd = new Date(scheduledAt.getTime() + duration * 60000);

    const conflict = await this.prisma.appointment.findFirst({
      where: {
        tenantId,
        doctorId: dto.doctorId,
        status: { in: ['SCHEDULED', 'CONFIRMED', 'WAITING', 'IN_PROGRESS'] },
        scheduledAt: { gte: scheduledAt, lt: conflictEnd },
      },
    });
    if (conflict) {
      throw new BadRequestException('Horário já reservado. Escolha outro horário.');
    }

    return this.prisma.appointment.create({
      data: {
        tenantId,
        patientId,
        doctorId: dto.doctorId,
        type: (dto.type as 'FIRST_VISIT' | 'RETURN' | 'FOLLOW_UP') ?? 'FIRST_VISIT',
        status: 'SCHEDULED',
        scheduledAt,
        duration,
        isTelemedicine: dto.isTelemedicine ?? false,
        notes: dto.notes,
      },
    });
  }

  async rescheduleAppointment(
    tenantId: string,
    userEmail: string,
    appointmentId: string,
    dto: { scheduledAt: string; reason?: string },
  ) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, patientId },
    });
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)) {
      throw new BadRequestException('Não é possível reagendar este agendamento.');
    }

    const newDate = new Date(dto.scheduledAt);
    if (newDate <= new Date()) {
      throw new BadRequestException('Novo horário deve ser no futuro.');
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        scheduledAt: newDate,
        status: 'RESCHEDULED',
        notes: dto.reason
          ? `${appointment.notes ?? ''}\nReagendado: ${dto.reason}`.trim()
          : appointment.notes,
      },
    });
  }

  async cancelAppointment(
    tenantId: string,
    userEmail: string,
    appointmentId: string,
    reason?: string,
  ) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, patientId },
    });
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado.');
    }
    if (['COMPLETED', 'CANCELLED'].includes(appointment.status)) {
      throw new BadRequestException('Agendamento já finalizado ou cancelado.');
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason ?? 'Cancelado pelo paciente',
      },
    });
  }

  // =========================================================================
  // Waitlist
  // =========================================================================

  async joinWaitlist(
    tenantId: string,
    userEmail: string,
    dto: {
      doctorId?: string;
      specialty?: string;
      preferredDays?: number[];
      preferredTimeStart?: string;
      preferredTimeEnd?: string;
    },
  ) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);
    const userId = (await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    }))!.id;

    const entry: WaitlistEntry = {
      id: crypto.randomUUID(),
      patientId,
      tenantId,
      doctorId: dto.doctorId,
      specialty: dto.specialty,
      preferredDays: dto.preferredDays ?? [1, 2, 3, 4, 5],
      preferredTimeRange: dto.preferredTimeStart && dto.preferredTimeEnd
        ? { start: dto.preferredTimeStart, end: dto.preferredTimeEnd }
        : undefined,
      status: 'WAITING',
      createdAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId: userId,
        type: 'CUSTOM',
        title: `[WAITLIST] ${dto.specialty ?? 'Geral'} — ${dto.doctorId ?? 'Qualquer médico'}`,
        content: JSON.stringify(entry),
        status: 'DRAFT',
      },
    });

    return { waitlistId: doc.id, status: 'WAITING', position: await this.getWaitlistPosition(tenantId, doc.id) };
  }

  async getMyWaitlistEntries(tenantId: string, userEmail: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        type: 'CUSTOM',
        title: { startsWith: '[WAITLIST]' },
        status: 'DRAFT',
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((d, index) => {
      const entry = JSON.parse(d.content ?? '{}') as WaitlistEntry;
      return {
        waitlistId: d.id,
        specialty: entry.specialty,
        doctorId: entry.doctorId,
        status: entry.status,
        position: index + 1,
        createdAt: entry.createdAt,
      };
    });
  }

  async removeFromWaitlist(tenantId: string, userEmail: string, waitlistId: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: waitlistId, tenantId, patientId, type: 'CUSTOM', title: { startsWith: '[WAITLIST]' } },
    });
    if (!doc) {
      throw new NotFoundException('Entrada na lista de espera não encontrada.');
    }

    await this.prisma.clinicalDocument.update({
      where: { id: waitlistId },
      data: { status: 'VOIDED' },
    });

    return { waitlistId, status: 'REMOVED' };
  }

  private async getWaitlistPosition(tenantId: string, waitlistId: string): Promise<number> {
    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: waitlistId },
      select: { createdAt: true },
    });
    if (!doc) return 0;

    const count = await this.prisma.clinicalDocument.count({
      where: {
        tenantId,
        type: 'CUSTOM',
        title: { startsWith: '[WAITLIST]' },
        status: 'DRAFT',
        createdAt: { lte: doc.createdAt },
      },
    });
    return count;
  }

  // =========================================================================
  // Recurring scheduling
  // =========================================================================

  async createRecurringSchedule(
    tenantId: string,
    userEmail: string,
    dto: {
      doctorId: string;
      intervalMonths: number;
      type?: string;
      notes?: string;
    },
  ) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);
    const userId = (await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    }))!.id;

    if (![3, 6, 12].includes(dto.intervalMonths)) {
      throw new BadRequestException('Intervalo deve ser 3, 6 ou 12 meses.');
    }

    const nextDueDate = new Date();
    nextDueDate.setMonth(nextDueDate.getMonth() + dto.intervalMonths);

    const recurring: RecurringSchedule = {
      id: crypto.randomUUID(),
      patientId,
      tenantId,
      doctorId: dto.doctorId,
      intervalMonths: dto.intervalMonths,
      nextDueDate: nextDueDate.toISOString(),
      type: dto.type ?? 'FOLLOW_UP',
      notes: dto.notes,
      isActive: true,
      history: [],
      createdAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId: userId,
        type: 'CUSTOM',
        title: `[RECURRING] a cada ${dto.intervalMonths} meses`,
        content: JSON.stringify(recurring),
        status: 'SIGNED',
      },
    });

    return { recurringId: doc.id, intervalMonths: dto.intervalMonths, nextDueDate: nextDueDate.toISOString() };
  }

  async getRecurringSchedules(tenantId: string, userEmail: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const docs = await this.prisma.clinicalDocument.findMany({
      where: {
        tenantId,
        patientId,
        type: 'CUSTOM',
        title: { startsWith: '[RECURRING]' },
        status: 'SIGNED',
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((d) => {
      const rec = JSON.parse(d.content ?? '{}') as RecurringSchedule;
      return {
        recurringId: d.id,
        doctorId: rec.doctorId,
        intervalMonths: rec.intervalMonths,
        nextDueDate: rec.nextDueDate,
        isActive: rec.isActive,
        history: rec.history,
      };
    });
  }

  async cancelRecurringSchedule(tenantId: string, userEmail: string, recurringId: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: recurringId, tenantId, patientId, type: 'CUSTOM', title: { startsWith: '[RECURRING]' } },
    });
    if (!doc) {
      throw new NotFoundException('Agendamento recorrente não encontrado.');
    }

    const recurring = JSON.parse(doc.content ?? '{}') as RecurringSchedule;
    recurring.isActive = false;

    await this.prisma.clinicalDocument.update({
      where: { id: recurringId },
      data: { content: JSON.stringify(recurring), status: 'VOIDED' },
    });

    return { recurringId, status: 'CANCELLED' };
  }

  async confirmAppointment(
    tenantId: string,
    userEmail: string,
    appointmentId: string,
  ) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId, patientId, status: 'SCHEDULED' },
    });
    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado ou já confirmado.');
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CONFIRMED' },
    });
  }
}
