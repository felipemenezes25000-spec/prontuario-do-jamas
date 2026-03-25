import { Module } from '@nestjs/common';
import { FinancialDashboardService } from './financial-dashboard.service';
import { FinancialDashboardController } from './financial-dashboard.controller';

@Module({
  controllers: [FinancialDashboardController],
  providers: [FinancialDashboardService],
  exports: [FinancialDashboardService],
})
export class FinancialDashboardModule {}
