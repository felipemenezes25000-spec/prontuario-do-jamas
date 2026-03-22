import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS';

export type NotificationType =
  | 'ALERT'
  | 'REMINDER'
  | 'MESSAGE'
  | 'TASK'
  | 'RESULT'
  | 'APPOINTMENT'
  | 'SYSTEM';

export interface NotificationJobData {
  userId: string;
  tenantId: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, unknown>;
  actionUrl?: string;
}

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { userId, tenantId, channel, title, body, type, data, actionUrl } =
      job.data;

    this.logger.log(
      `Processing notification job ${job.id} (channel: ${channel}, user: ${userId})`,
    );

    try {
      switch (channel) {
        case 'IN_APP':
          await this.handleInApp(
            userId,
            tenantId,
            title,
            body,
            type,
            data,
            actionUrl,
          );
          break;
        case 'EMAIL':
          await this.handleEmail(userId, title, body);
          break;
        case 'PUSH':
          await this.handlePush(userId, title, body);
          break;
        case 'SMS':
          await this.handleSms(userId, title, body);
          break;
        default:
          this.logger.warn(`Unknown notification channel: ${channel}`);
      }

      this.logger.log(`Notification job ${job.id} completed`);
    } catch (error) {
      this.logger.error(
        `Notification job ${job.id} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async handleInApp(
    userId: string,
    tenantId: string,
    title: string,
    body: string,
    type: NotificationType,
    data?: Record<string, unknown>,
    actionUrl?: string,
  ): Promise<void> {
    // Persist notification in DB
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        tenantId,
        title,
        body,
        type,
        channel: 'IN_APP',
        data: (data as any) ?? undefined,
        actionUrl,
        sentAt: new Date(),
      },
    });

    // Emit real-time WebSocket event
    this.realtime.emitNotification(userId, notification);
  }

  private async handleEmail(
    userId: string,
    title: string,
    body: string,
  ): Promise<void> {
    // TODO: Integrate with AWS SES or another email provider
    this.logger.log(
      `[EMAIL] Would send email to user ${userId}: "${title}" — ${body}`,
    );
  }

  private async handlePush(
    userId: string,
    title: string,
    body: string,
  ): Promise<void> {
    // TODO: Integrate with FCM (Firebase Cloud Messaging) or APNs
    this.logger.log(
      `[PUSH] Would send push notification to user ${userId}: "${title}" — ${body}`,
    );
  }

  private async handleSms(
    userId: string,
    title: string,
    body: string,
  ): Promise<void> {
    // TODO: Integrate with SMS API (e.g., AWS SNS, Twilio)
    this.logger.log(
      `[SMS] Would send SMS to user ${userId}: "${title}" — ${body}`,
    );
  }
}
