import { Module } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionSafetyService } from './prescription-safety.service';
import { PrescriptionsEnhancedService } from './prescriptions-enhanced.service';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsEnhancedController } from './prescriptions-enhanced.controller';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [DocumentsModule],
  controllers: [PrescriptionsController, PrescriptionsEnhancedController],
  providers: [PrescriptionsService, PrescriptionSafetyService, PrescriptionsEnhancedService],
  exports: [PrescriptionsService, PrescriptionSafetyService, PrescriptionsEnhancedService],
})
export class PrescriptionsModule {}
