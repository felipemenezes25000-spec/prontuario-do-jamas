import { Module } from '@nestjs/common';
import { PatientSafetyAdvancedController } from './patient-safety-advanced.controller';
import { PatientSafetyAdvancedService } from './patient-safety-advanced.service';

@Module({
  controllers: [PatientSafetyAdvancedController],
  providers: [PatientSafetyAdvancedService],
  exports: [PatientSafetyAdvancedService],
})
export class PatientSafetyModule {}
