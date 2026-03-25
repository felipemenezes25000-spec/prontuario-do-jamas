import { Module } from '@nestjs/common';
import { SelfServiceAnalyticsController } from './self-service-analytics.controller';
import { SelfServiceAnalyticsService } from './self-service-analytics.service';

@Module({
  controllers: [SelfServiceAnalyticsController],
  providers: [SelfServiceAnalyticsService],
  exports: [SelfServiceAnalyticsService],
})
export class SelfServiceAnalyticsModule {}
