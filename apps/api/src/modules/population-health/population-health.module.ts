import { Module } from '@nestjs/common';
import { PopulationHealthService } from './population-health.service';
import { PopulationHealthController } from './population-health.controller';

@Module({
  controllers: [PopulationHealthController],
  providers: [PopulationHealthService],
  exports: [PopulationHealthService],
})
export class PopulationHealthModule {}
