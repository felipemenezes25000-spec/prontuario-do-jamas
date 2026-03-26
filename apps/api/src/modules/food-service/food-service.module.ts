import { Module } from '@nestjs/common';
import { FoodServiceService } from './food-service.service';
import { FoodServiceController } from './food-service.controller';

@Module({
  controllers: [FoodServiceController],
  providers: [FoodServiceService],
  exports: [FoodServiceService],
})
export class FoodServiceModule {}
