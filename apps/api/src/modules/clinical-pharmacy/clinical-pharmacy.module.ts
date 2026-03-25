import { Module } from '@nestjs/common';
import { ClinicalPharmacyService } from './clinical-pharmacy.service';
import { ClinicalPharmacyController } from './clinical-pharmacy.controller';

@Module({
  controllers: [ClinicalPharmacyController],
  providers: [ClinicalPharmacyService],
  exports: [ClinicalPharmacyService],
})
export class ClinicalPharmacyModule {}
