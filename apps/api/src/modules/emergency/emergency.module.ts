import { Module } from '@nestjs/common';
import { EmergencyController } from './emergency.controller';
import { EmergencyService } from './emergency.service';
import { EmergencyBoardService } from './emergency-board.service';
import { EmergencyBoardController } from './emergency-board.controller';

@Module({
  controllers: [EmergencyController, EmergencyBoardController],
  providers: [EmergencyService, EmergencyBoardService],
  exports: [EmergencyService, EmergencyBoardService],
})
export class EmergencyModule {}
