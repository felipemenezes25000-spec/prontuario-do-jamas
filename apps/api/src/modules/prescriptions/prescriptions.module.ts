import { Module } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionSafetyService } from './prescription-safety.service';
import { PrescriptionsEnhancedService } from './prescriptions-enhanced.service';
import { OrderSetsService } from './order-sets.service';
import { PrescriptionAlertsService } from './prescription-alerts.service';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsEnhancedController } from './prescriptions-enhanced.controller';
import { OrderSetsController } from './order-sets.controller';
import { PrescriptionAlertsController } from './prescription-alerts.controller';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [DocumentsModule],
  controllers: [
    PrescriptionsController,
    PrescriptionsEnhancedController,
    OrderSetsController,
    PrescriptionAlertsController,
  ],
  providers: [
    PrescriptionsService,
    PrescriptionSafetyService,
    PrescriptionsEnhancedService,
    OrderSetsService,
    PrescriptionAlertsService,
  ],
  exports: [
    PrescriptionsService,
    PrescriptionSafetyService,
    PrescriptionsEnhancedService,
    OrderSetsService,
    PrescriptionAlertsService,
  ],
})
export class PrescriptionsModule {}
