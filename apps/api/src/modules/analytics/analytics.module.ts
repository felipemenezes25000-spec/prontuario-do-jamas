import { Module } from '@nestjs/common';
import { QualityMeasuresModule } from './quality-measures/quality-measures.module';
import { RegulatoryReportsModule } from './regulatory-reports/regulatory-reports.module';
import { EnhancedAnalyticsModule } from './enhanced/enhanced-analytics.module';
import { ComprehensiveAnalyticsModule } from './comprehensive/comprehensive-analytics.module';
import { AnalyticsQualityController } from './analytics-quality.controller';
import { AnalyticsQualityService } from './analytics-quality.service';

@Module({
  imports: [
    QualityMeasuresModule,
    RegulatoryReportsModule,
    EnhancedAnalyticsModule,
    ComprehensiveAnalyticsModule,
  ],
  controllers: [AnalyticsQualityController],
  providers: [AnalyticsQualityService],
  exports: [AnalyticsQualityService],
})
export class AnalyticsModule {}
