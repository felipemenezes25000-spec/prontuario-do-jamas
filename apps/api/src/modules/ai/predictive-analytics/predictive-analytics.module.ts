import { Module } from '@nestjs/common';
import { PredictiveAnalyticsController } from './predictive-analytics.controller';
import { PredictiveAnalyticsService } from './predictive-analytics.service';

@Module({
  controllers: [PredictiveAnalyticsController],
  providers: [PredictiveAnalyticsService],
  exports: [PredictiveAnalyticsService],
})
export class PredictiveAnalyticsModule {}
