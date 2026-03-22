import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { TissService } from './tiss.service';
import { AppealsService } from './appeals.service';
import { AppealsController } from './appeals.controller';

@Module({
  controllers: [BillingController, AppealsController],
  providers: [BillingService, TissService, AppealsService],
  exports: [BillingService, TissService, AppealsService],
})
export class BillingModule {}
