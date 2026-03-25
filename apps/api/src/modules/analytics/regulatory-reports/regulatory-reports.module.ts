import { Module } from '@nestjs/common';
import { RegulatoryReportsService } from './regulatory-reports.service';
import { RegulatoryReportsController } from './regulatory-reports.controller';

@Module({
  controllers: [RegulatoryReportsController],
  providers: [RegulatoryReportsService],
  exports: [RegulatoryReportsService],
})
export class RegulatoryReportsModule {}
