import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationEmitterService } from './notification-emitter.service';
import { NotificationsController } from './notifications.controller';
import { WhatsAppService } from './whatsapp.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationEmitterService, WhatsAppService],
  exports: [NotificationsService, NotificationEmitterService, WhatsAppService],
})
export class NotificationsModule {}
