import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { WristbandService } from './wristband.service';
import { PatientsEnhancedService } from './patients-enhanced.service';
import { PatientsEnhancedController } from './patients-enhanced.controller';

@Module({
  controllers: [PatientsController, PatientsEnhancedController],
  providers: [PatientsService, WristbandService, PatientsEnhancedService],
  exports: [PatientsService, WristbandService, PatientsEnhancedService],
})
export class PatientsModule {}
