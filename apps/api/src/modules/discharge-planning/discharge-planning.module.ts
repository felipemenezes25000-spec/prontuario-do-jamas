import { Module } from '@nestjs/common';
import { DischargePlanningService } from './discharge-planning.service';
import { DischargePlanningController } from './discharge-planning.controller';

@Module({
  controllers: [DischargePlanningController],
  providers: [DischargePlanningService],
  exports: [DischargePlanningService],
})
export class DischargePlanningModule {}
