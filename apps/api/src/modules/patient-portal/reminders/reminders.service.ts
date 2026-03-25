import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

interface ReminderRecord {
  id: string;
  patientId: string;
  tenantId: string;
  reminderType: string;
  channel: string;
  title: string;
  message: string;
  scheduledAt: string;
  sentAt?: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  relatedId?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  createdAt: string;
}

@Injectable()
export class RemindersService {
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

  async createReminder(
    tenantId: string,
    userEmail: string,
    dto: {
      reminderType: string;
      channel: string;
      title: string;
      message: string;
      scheduledAt: string;
      relatedId?: string;
      isRecurring?: boolean;
      recurrenceRule?: string;
    },
  ) {
    const userId = (await this.prisma.user.findFirst({
      where: { tenantId, email: userEmail },
      select: { id: true },
    }))!.id;

    const patientId = dto.relatedId
      ? (await this.prisma.patient.findFirst({ where: { tenantId, isActive: true }, select: { id: true } }))?.id ?? userId
      : userId;

    const reminder: ReminderRecord = {
      id: crypto.randomUUID(),
      patientId,
      tenantId,
      reminderType: dto.reminderType,
      channel: dto.channel,
      title: dto.title,
      message: dto.message,
      scheduledAt: dto.scheduledAt,
      status: 'PENDING',
      relatedId: dto.relatedId,
      isRecurring: dto.isRecurring ?? false,
      recurrenceRule: dto.recurrenceRule,
      createdAt: new Date().toISOString(),
    };

    const doc = await this.prisma.clinicalDocument.create({
      data: {
        tenantId,
        patientId,
        authorId: userId,
        type: 'CUSTOM',
        title: `[REMINDER:${dto.reminderType}] ${dto.title}`,
        content: JSON.stringify(reminder),
        status: 'DRAFT',
      },
    });

    return { reminderId: doc.id, reminderType: dto.reminderType, scheduledAt: dto.scheduledAt };
  }

  async listReminders(
    tenantId: string,
    userEmail: string,
    options: { status?: string; page?: number; pageSize?: number },
  ) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      tenantId,
      patientId,
      type: 'CUSTOM',
      title: { startsWith: '[REMINDER:' },
      status: { not: 'VOIDED' },
    };

    const [docs, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, content: true, createdAt: true },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    const data = docs.map((d) => {
      const r = JSON.parse(d.content ?? '{}') as ReminderRecord;
      return {
        reminderId: d.id,
        reminderType: r.reminderType,
        channel: r.channel,
        title: r.title,
        scheduledAt: r.scheduledAt,
        status: r.status,
        sentAt: r.sentAt,
        isRecurring: r.isRecurring,
      };
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async cancelReminder(tenantId: string, userEmail: string, reminderId: string) {
    const patientId = await this.resolvePatientId(tenantId, userEmail);

    const doc = await this.prisma.clinicalDocument.findFirst({
      where: { id: reminderId, tenantId, patientId, type: 'CUSTOM', title: { startsWith: '[REMINDER:' } },
    });
    if (!doc) throw new NotFoundException('Lembrete não encontrado.');

    const reminder = JSON.parse(doc.content ?? '{}') as ReminderRecord;
    reminder.status = 'CANCELLED';

    await this.prisma.clinicalDocument.update({
      where: { id: reminderId },
      data: { content: JSON.stringify(reminder), status: 'VOIDED' },
    });

    return { reminderId, status: 'CANCELLED' };
  }

  async generateAppointmentReminders(tenantId: string) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        scheduledAt: { gte: tomorrow, lt: dayAfter },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      include: {
        patient: { select: { id: true, fullName: true, phone: true, email: true } },
        doctor: { select: { name: true } },
      },
    });

    const reminders: Array<{ appointmentId: string; patientName: string; channel: string }> = [];

    for (const apt of appointments) {
      if (!apt.patient) continue;

      const channel = apt.patient.phone ? 'WHATSAPP' : 'EMAIL';
      const scheduledTime = apt.scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const firstUser = await this.prisma.user.findFirst({
        where: { tenantId, email: apt.patient.email ?? '' },
        select: { id: true },
      });
      const authorId = firstUser?.id ?? (await this.prisma.user.findFirst({ where: { tenantId, role: 'ADMIN' }, select: { id: true } }))?.id;

      if (!authorId) continue;

      const reminder: ReminderRecord = {
        id: crypto.randomUUID(),
        patientId: apt.patient.id,
        tenantId,
        reminderType: 'APPOINTMENT',
        channel,
        title: 'Lembrete de Consulta',
        message: `Olá ${apt.patient.fullName}, lembramos que sua consulta com Dr(a). ${apt.doctor?.name} está agendada para amanhã às ${scheduledTime}. Confirme sua presença.`,
        scheduledAt: new Date().toISOString(),
        status: 'PENDING',
        relatedId: apt.id,
        isRecurring: false,
        createdAt: new Date().toISOString(),
      };

      await this.prisma.clinicalDocument.create({
        data: {
          tenantId,
          patientId: apt.patient.id,
          authorId,
          type: 'CUSTOM',
          title: `[REMINDER:APPOINTMENT] ${apt.patient.fullName}`,
          content: JSON.stringify(reminder),
          status: 'DRAFT',
        },
      });

      reminders.push({ appointmentId: apt.id, patientName: apt.patient.fullName, channel });
    }

    return { generated: reminders.length, reminders };
  }
}
