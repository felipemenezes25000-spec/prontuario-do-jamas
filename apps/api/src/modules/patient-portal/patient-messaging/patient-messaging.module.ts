import { Module } from '@nestjs/common';
import { PatientMessagingService } from './patient-messaging.service';
import { PatientMessagingController } from './patient-messaging.controller';

@Module({
  controllers: [PatientMessagingController],
  providers: [PatientMessagingService],
  exports: [PatientMessagingService],
})
export class PatientMessagingModule {}
