import { Module } from '@nestjs/common';
import { DischargePlanningService } from './discharge-planning.service';
import { DischargePlanningController } from './discharge-planning.controller';
import { DischargeAdvancedController } from './discharge-advanced.controller';
import { DischargeAdvancedService } from './discharge-advanced.service';
import { DischargeEnhancedService } from './discharge-enhanced.service';
import { DischargeEnhancedController } from './discharge-enhanced.controller';

@Module({
  controllers: [DischargePlanningController, DischargeAdvancedController, DischargeEnhancedController],
  providers: [DischargePlanningService, DischargeAdvancedService, DischargeEnhancedService],
  exports: [DischargePlanningService, DischargeAdvancedService, DischargeEnhancedService],
})
export class DischargePlanningModule {}
