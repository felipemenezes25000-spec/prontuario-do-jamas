import { Module } from '@nestjs/common';
import { ObstetricsController } from './obstetrics.controller';
import { ObstetricsService } from './obstetrics.service';

@Module({
  controllers: [ObstetricsController],
  providers: [ObstetricsService],
  exports: [ObstetricsService],
})
export class ObstetricsModule {}
