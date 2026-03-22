import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { QueryAppointmentDto } from './dto/query-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async schedule(tenantId: string, dto: CreateAppointmentDto) {
    return this.prisma.appointment.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        type: dto.type,
        scheduledAt: new Date(dto.scheduledAt),
        duration: dto.duration ?? 30,
        location: dto.location,
        room: dto.room,
        isTelemedicine: dto.isTelemedicine ?? false,
        notes: dto.notes,
      },
    });
  }

  async findAll(tenantId: string, query: QueryAppointmentDto) {
    const where: Record<string, unknown> = { tenantId };

    if (query.doctorId) where.doctorId = query.doctorId;
    if (query.patientId) where.patientId = query.patientId;
    if (query.status) where.status = query.status;

    if (query.dateFrom || query.dateTo) {
      where.scheduledAt = {};
      if (query.dateFrom) {
        (where.scheduledAt as Record<string, unknown>).gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        (where.scheduledAt as Record<string, unknown>).lte = new Date(query.dateTo);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { scheduledAt: 'asc' },
        include: {
          patient: { select: { id: true, fullName: true, mrn: true, phone: true } },
          doctor: { select: { id: true, name: true } },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async findById(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true, phone: true, email: true } },
        doctor: { select: { id: true, name: true, email: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID "${id}" not found`);
    }

    return appointment;
  }

  async findByDoctor(tenantId: string, doctorId: string, dateFrom: string, dateTo: string) {
    return this.prisma.appointment.findMany({
      where: {
        tenantId,
        doctorId,
        scheduledAt: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo),
        },
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        patient: { select: { id: true, fullName: true, mrn: true, phone: true } },
      },
    });
  }

  async findByPatient(patientId: string) {
    return this.prisma.appointment.findMany({
      where: { patientId },
      orderBy: { scheduledAt: 'desc' },
      include: {
        doctor: { select: { id: true, name: true } },
      },
    });
  }

  async confirm(id: string) {
    await this.findById(id);
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });
  }

  async cancel(id: string, cancellationReason: string) {
    await this.findById(id);
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason,
      },
    });
  }

  async reschedule(id: string, dto: UpdateAppointmentDto) {
    await this.findById(id);

    if (!dto.scheduledAt) {
      throw new BadRequestException('scheduledAt is required for rescheduling');
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        scheduledAt: new Date(dto.scheduledAt),
        duration: dto.duration,
        location: dto.location,
        room: dto.room,
        status: 'RESCHEDULED',
      },
    });
  }

  async getAvailableSlots(
    tenantId: string,
    doctorId: string,
    date: string,
  ) {
    // Get doctor's schedule for that day
    const dayOfWeek = new Date(date).getDay();

    const schedules = await this.prisma.professionalSchedule.findMany({
      where: {
        professionalId: doctorId,
        dayOfWeek,
      },
    });

    if (schedules.length === 0) {
      return [];
    }

    // Get existing appointments for that day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledAt: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
      },
      select: { scheduledAt: true, duration: true },
    });

    // Generate available slots
    const slots: { startTime: string; endTime: string }[] = [];

    for (const schedule of schedules) {
      const startParts = schedule.startTime.split(':').map(Number);
      const endParts = schedule.endTime.split(':').map(Number);
      const startHour = startParts[0] ?? 0;
      const startMin = startParts[1] ?? 0;
      const endHour = endParts[0] ?? 0;
      const endMin = endParts[1] ?? 0;
      const slotDuration = schedule.slotDuration;

      let currentTime = startHour * 60 + startMin;
      const scheduleEnd = endHour * 60 + endMin;

      // Handle break time
      let breakStart = 0;
      let breakEnd = 0;
      if (schedule.breakStart && schedule.breakEnd) {
        const bsParts = schedule.breakStart.split(':').map(Number);
        const beParts = schedule.breakEnd.split(':').map(Number);
        breakStart = (bsParts[0] ?? 0) * 60 + (bsParts[1] ?? 0);
        breakEnd = (beParts[0] ?? 0) * 60 + (beParts[1] ?? 0);
      }

      while (currentTime + slotDuration <= scheduleEnd) {
        // Skip break time
        if (breakStart && currentTime >= breakStart && currentTime < breakEnd) {
          currentTime = breakEnd;
          continue;
        }

        const slotStart = new Date(date);
        slotStart.setHours(Math.floor(currentTime / 60), currentTime % 60, 0, 0);

        const slotEnd = new Date(date);
        slotEnd.setHours(
          Math.floor((currentTime + slotDuration) / 60),
          (currentTime + slotDuration) % 60,
          0,
          0,
        );

        // Check if slot conflicts with existing appointments
        const isOccupied = existingAppointments.some((appt) => {
          const apptStart = new Date(appt.scheduledAt).getTime();
          const apptEnd = apptStart + appt.duration * 60000;
          return slotStart.getTime() < apptEnd && slotEnd.getTime() > apptStart;
        });

        if (!isOccupied) {
          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
          });
        }

        currentTime += slotDuration;
      }
    }

    return slots;
  }
}
