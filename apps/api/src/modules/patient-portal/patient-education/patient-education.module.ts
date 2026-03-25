import { Module } from '@nestjs/common';
import { PatientEducationService } from './patient-education.service';
import { PatientEducationController } from './patient-education.controller';

@Module({
  controllers: [PatientEducationController],
  providers: [PatientEducationService],
  exports: [PatientEducationService],
})
export class PatientEducationModule {}
