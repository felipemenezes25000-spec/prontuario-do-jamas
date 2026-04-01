import { Module } from '@nestjs/common';
import { EmergencyController } from './emergency.controller';
import { EmergencyService } from './emergency.service';
import { EmergencyBoardService } from './emergency-board.service';
import { EmergencyBoardController } from './emergency-board.controller';
import { ClinicalProtocolsService } from './clinical-protocols.service';
import { ClinicalProtocolsController } from './clinical-protocols.controller';

@Module({
  controllers: [EmergencyController, EmergencyBoardController, ClinicalProtocolsController],
  providers: [EmergencyService, EmergencyBoardService, ClinicalProtocolsService],
  exports: [EmergencyService, EmergencyBoardService, ClinicalProtocolsService],
})
export class EmergencyModule {}
