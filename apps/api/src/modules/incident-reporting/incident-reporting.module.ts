import { Module } from '@nestjs/common';
import { IncidentReportingService } from './incident-reporting.service';
import { IncidentReportingController } from './incident-reporting.controller';

@Module({
  controllers: [IncidentReportingController],
  providers: [IncidentReportingService],
  exports: [IncidentReportingService],
})
export class IncidentReportingModule {}
