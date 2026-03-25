import { Module } from '@nestjs/common';
import { ParenteralNutritionService } from './parenteral-nutrition.service';
import { ParenteralNutritionController } from './parenteral-nutrition.controller';

@Module({
  controllers: [ParenteralNutritionController],
  providers: [ParenteralNutritionService],
  exports: [ParenteralNutritionService],
})
export class ParenteralNutritionModule {}
