import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import type { NotificationType, NotificationChannel } from '@prisma/client';

export interface EmitNotificationParams {
  userId: string;
  tenantId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channel?: NotificationChannel;
  actionUrl?: string;
}

@Injectable()
export class NotificationEmitterService {
  private readonly logger = new Logger(NotificationEmitterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  /**
   * Save notification to DB and emit via Socket.IO to the target user.
   */
  async emit(params: EmitNotificationParams): Promise<void> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        tenantId: params.tenantId,
        type: params.type,
        title: params.title,
        body: params.body,
        data: params.data ? (params.data as Prisma.InputJsonValue) : undefined,
        channel: params.channel ?? 'IN_APP',
        actionUrl: params.actionUrl,
        sentAt: new Date(),
      },
    });

    this.realtimeGateway.emitNotification(params.userId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      actionUrl: notification.actionUrl,
      createdAt: notification.createdAt.toISOString(),
    });

    this.logger.debug(
      `Notification emitted to user ${params.userId}: ${params.title}`,
    );
  }

  /**
   * Emit notification to multiple users.
   */
  async emitToMany(
    userIds: string[],
    params: Omit<EmitNotificationParams, 'userId'>,
  ): Promise<void> {
    await Promise.all(
      userIds.map((userId) => this.emit({ ...params, userId })),
    );
  }

  // =========================================================================
  // DOMAIN-SPECIFIC EMITTERS
  // =========================================================================

  /**
   * Notify nurses when a new prescription is created.
   */
  async notifyPrescriptionCreated(
    tenantId: string,
    nurseIds: string[],
    patientName: string,
    bedLabel: string,
    encounterId: string,
  ): Promise<void> {
    await this.emitToMany(nurseIds, {
      tenantId,
      type: 'ALERT',
      title: `Nova prescrição para Leito ${bedLabel}`,
      body: `Prescrição criada para ${patientName}. Verifique os itens.`,
      actionUrl: `/atendimentos/${encounterId}`,
    });
  }

  /**
   * Notify requesting doctor when an exam result arrives.
   */
  async notifyExamResultReady(
    tenantId: string,
    doctorId: string,
    examName: string,
    patientName: string,
    encounterId: string,
  ): Promise<void> {
    await this.emit({
      userId: doctorId,
      tenantId,
      type: 'RESULT',
      title: `Resultado disponível: ${examName}`,
      body: `O resultado de ${examName} para ${patientName} está pronto.`,
      actionUrl: `/atendimentos/${encounterId}`,
    });
  }

  /**
   * Notify on-duty doctor when a RED or ORANGE triage arrives.
   */
  async notifyUrgentTriage(
    tenantId: string,
    doctorIds: string[],
    triageLevel: string,
    patientName: string,
  ): Promise<void> {
    const levelLabels: Record<string, string> = {
      RED: 'VERMELHA',
      ORANGE: 'LARANJA',
    };
    const label = levelLabels[triageLevel] ?? triageLevel;

    await this.emitToMany(doctorIds, {
      tenantId,
      type: 'ALERT',
      title: `Triagem ${label}: ${patientName}`,
      body: `Paciente ${patientName} classificado como triagem ${label}. Atendimento imediato necessário.`,
      actionUrl: '/triagem/painel',
    });
  }

  /**
   * Notify nurse when medication is overdue (>30min).
   */
  async notifyMedicationOverdue(
    tenantId: string,
    nurseId: string,
    medicationName: string,
    bedLabel: string,
    encounterId: string,
  ): Promise<void> {
    await this.emit({
      userId: nurseId,
      tenantId,
      type: 'REMINDER',
      title: `Medicamento atrasado: ${medicationName} Leito ${bedLabel}`,
      body: `O medicamento ${medicationName} está atrasado há mais de 30 minutos.`,
      actionUrl: `/atendimentos/${encounterId}`,
    });
  }
}
