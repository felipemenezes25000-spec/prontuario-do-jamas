import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { TissService } from './tiss.service';

@Module({
  controllers: [BillingController],
  providers: [BillingService, TissService],
  exports: [BillingService, TissService],
})
export class BillingModule {}
