import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { EnhancedAnalyticsController } from './enhanced-analytics.controller';
import { EnhancedAnalyticsService } from './enhanced-analytics.service';

@Module({
  imports: [PrismaModule],
  controllers: [EnhancedAnalyticsController],
  providers: [EnhancedAnalyticsService],
  exports: [EnhancedAnalyticsService],
})
export class EnhancedAnalyticsModule {}
