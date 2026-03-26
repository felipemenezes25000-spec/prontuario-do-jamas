import { Module } from '@nestjs/common';
import { IcuMonitoringService } from './icu-monitoring.service';
import { IcuMonitoringController } from './icu-monitoring.controller';

@Module({
  controllers: [IcuMonitoringController],
  providers: [IcuMonitoringService],
  exports: [IcuMonitoringService],
})
export class IcuMonitoringModule {}
