import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { WristbandService } from './wristband.service';

@Module({
  controllers: [PatientsController],
  providers: [PatientsService, WristbandService],
  exports: [PatientsService, WristbandService],
})
export class PatientsModule {}
