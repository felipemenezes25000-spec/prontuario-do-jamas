import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { TranscriptionProcessor } from './processors/transcription.processor';
import { AiProcessor } from './processors/ai.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    AiModule,
    PrismaModule,
    RealtimeModule,
    StorageModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('redis.url') || 'redis://localhost:6379';
        const parsed = new URL(redisUrl);
        return {
          connection: {
            host: parsed.hostname,
            port: parseInt(parsed.port || '6379', 10),
            password: parsed.password || undefined,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: 'transcription' },
      { name: 'ai-processing' },
      { name: 'notifications' },
      { name: 'reports' },
    ),
  ],
  providers: [TranscriptionProcessor, AiProcessor, NotificationProcessor],
  exports: [BullModule],
})
export class QueuesModule {}
