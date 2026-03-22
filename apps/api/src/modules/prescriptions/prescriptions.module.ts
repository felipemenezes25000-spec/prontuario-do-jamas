import { Module } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionSafetyService } from './prescription-safety.service';
import { PrescriptionsController } from './prescriptions.controller';

@Module({
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, PrescriptionSafetyService],
  exports: [PrescriptionsService, PrescriptionSafetyService],
})
export class PrescriptionsModule {}
