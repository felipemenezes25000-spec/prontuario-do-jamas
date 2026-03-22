import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface CreateBookingData {
  doctorId: string;
  date: string;
  time: string;
  patientName: string;
  patientCpf: string;
  patientPhone: string;
  insuranceProvider?: string;
}

export interface SlotInfo {
  time: string;
  available: boolean;
}

export interface DoctorInfo {
  id: string;
  name: string;
  specialty: string;
  crm: string;
}

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSpecialties(tenantSlug: string): Promise<string[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) throw new NotFoundException('Hospital não encontrado');

    const profiles = await this.prisma.doctorProfile.findMany({
      where: {
        user: { tenantId: tenant.id, isActive: true },
      },
      select: { specialty: true },
      distinct: ['specialty'],
    });

    return profiles.map((p) => p.specialty).filter(Boolean);
  }

  async getDoctors(tenantSlug: string, specialty?: string): Promise<DoctorInfo[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) throw new NotFoundException('Hospital não encontrado');

    const where: Record<string, unknown> = {
      tenantId: tenant.id,
      isActive: true,
      role: 'DOCTOR',
    };

    const doctors = await this.prisma.user.findMany({
      where,
      include: { doctorProfile: true },
      orderBy: { name: 'asc' },
    });

    const mapped: DoctorInfo[] = doctors.map((d) => ({
      id: d.id,
      name: d.name,
      specialty: d.doctorProfile?.specialty ?? '',
      crm: d.doctorProfile?.crm ?? '',
    }));

    if (specialty) {
      return mapped.filter((d) => d.specialty === specialty);
    }

    return mapped;
  }

  async getAvailableSlots(
    tenantSlug: string,
    doctorId: string,
    date: string,
  ): Promise<SlotInfo[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) throw new NotFoundException('Hospital não encontrado');

    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    const booked = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        tenantId: tenant.id,
        scheduledAt: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { scheduledAt: true },
    });

    const bookedTimes = new Set(
      booked.map((b) => b.scheduledAt.toISOString()),
    );

    const slots: SlotInfo[] = [];
    for (let hour = 8; hour < 17; hour++) {
      for (const min of [0, 30]) {
        const slotTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        const slotDate = new Date(`${date}T${slotTime}:00`);
        slots.push({
          time: slotTime,
          available: !bookedTimes.has(slotDate.toISOString()),
        });
      }
    }

    return slots;
  }

  async createAppointment(tenantSlug: string, data: CreateBookingData) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) throw new NotFoundException('Hospital não encontrado');

    const cpfClean = data.patientCpf.replace(/\D/g, '');

    let patient = await this.prisma.patient.findFirst({
      where: { tenantId: tenant.id, cpf: cpfClean },
    });

    if (!patient) {
      patient = await this.prisma.patient.create({
        data: {
          tenantId: tenant.id,
          fullName: data.patientName,
          cpf: cpfClean,
          phone: data.patientPhone.replace(/\D/g, ''),
          insuranceProvider: data.insuranceProvider,
          birthDate: new Date('1990-01-01'), // placeholder — patient updates later
          gender: 'OTHER',
          mrn: `MRN-${Date.now()}`,
        },
      });
    }

    const scheduledAt = new Date(`${data.date}T${data.time}:00`);

    const appointment = await this.prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        doctorId: data.doctorId,
        scheduledAt,
        status: 'SCHEDULED',
        type: 'FIRST_VISIT',
      },
    });

    return {
      id: appointment.id,
      scheduledAt: appointment.scheduledAt,
      status: appointment.status,
    };
  }
}
