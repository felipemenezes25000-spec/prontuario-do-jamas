import { Module } from '@nestjs/common';
import { DischargePlanningService } from './discharge-planning.service';
import { DischargePlanningController } from './discharge-planning.controller';
import { DischargeAdvancedController } from './discharge-advanced.controller';
import { DischargeAdvancedService } from './discharge-advanced.service';

@Module({
  controllers: [DischargePlanningController, DischargeAdvancedController],
  providers: [DischargePlanningService, DischargeAdvancedService],
  exports: [DischargePlanningService, DischargeAdvancedService],
})
export class DischargePlanningModule {}
