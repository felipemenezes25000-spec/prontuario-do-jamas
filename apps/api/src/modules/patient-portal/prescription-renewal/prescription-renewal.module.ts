import { Module } from '@nestjs/common';
import { PrescriptionRenewalService } from './prescription-renewal.service';
import { PrescriptionRenewalController } from './prescription-renewal.controller';

@Module({
  controllers: [PrescriptionRenewalController],
  providers: [PrescriptionRenewalService],
  exports: [PrescriptionRenewalService],
})
export class PrescriptionRenewalModule {}
