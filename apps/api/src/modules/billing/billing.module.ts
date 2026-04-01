import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { TissService } from './tiss.service';
import { AppealsService } from './appeals.service';
import { AppealsController } from './appeals.controller';
import { BillingInsuranceService } from './billing-insurance.service';
import { BillingInsuranceController } from './billing-insurance.controller';
import { BillingAdvancedService } from './billing-advanced.service';
import { BillingAdvancedController } from './billing-advanced.controller';
import { DocumentsModule } from '../documents/documents.module';
import { CodingAutomationModule } from './coding-automation/coding-automation.module';
import { PriorAuthorizationModule } from './prior-authorization/prior-authorization.module';
import { DrgModule } from './drg/drg.module';
import { ChargeCaptureModule } from './charge-capture/charge-capture.module';
import { FinancialDashboardModule } from './financial-dashboard/financial-dashboard.module';
import { PrivatePayModule } from './private-pay/private-pay.module';

@Module({
  imports: [
    DocumentsModule,
    CodingAutomationModule,
    PriorAuthorizationModule,
    DrgModule,
    ChargeCaptureModule,
    FinancialDashboardModule,
    PrivatePayModule,
  ],
  controllers: [BillingController, AppealsController, BillingInsuranceController, BillingAdvancedController],
  providers: [BillingService, TissService, AppealsService, BillingInsuranceService, BillingAdvancedService],
  exports: [BillingService, TissService, AppealsService, BillingInsuranceService, BillingAdvancedService],
})
export class BillingModule {}
