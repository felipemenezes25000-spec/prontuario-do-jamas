import { Module } from '@nestjs/common';
import { PatientSurveysService } from './patient-surveys.service';
import { PatientSurveysController } from './patient-surveys.controller';

@Module({
  controllers: [PatientSurveysController],
  providers: [PatientSurveysService],
  exports: [PatientSurveysService],
})
export class PatientSurveysModule {}
