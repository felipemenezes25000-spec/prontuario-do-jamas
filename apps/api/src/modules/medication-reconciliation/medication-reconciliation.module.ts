import { Module } from '@nestjs/common';
import { MedicationReconciliationService } from './medication-reconciliation.service';
import { MedicationReconciliationController } from './medication-reconciliation.controller';

@Module({
  controllers: [MedicationReconciliationController],
  providers: [MedicationReconciliationService],
  exports: [MedicationReconciliationService],
})
export class MedicationReconciliationModule {}
