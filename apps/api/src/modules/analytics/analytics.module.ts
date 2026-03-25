import { Module } from '@nestjs/common';
import { QualityMeasuresModule } from './quality-measures/quality-measures.module';
import { RegulatoryReportsModule } from './regulatory-reports/regulatory-reports.module';
import { EnhancedAnalyticsModule } from './enhanced/enhanced-analytics.module';

@Module({
  imports: [QualityMeasuresModule, RegulatoryReportsModule, EnhancedAnalyticsModule],
})
export class AnalyticsModule {}
