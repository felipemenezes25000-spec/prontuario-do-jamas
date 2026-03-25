import { Module } from '@nestjs/common';
import { SchedulingEnhancedService } from './scheduling-enhanced.service';
import { SchedulingEnhancedController } from './scheduling-enhanced.controller';

@Module({
  controllers: [SchedulingEnhancedController],
  providers: [SchedulingEnhancedService],
  exports: [SchedulingEnhancedService],
})
export class SchedulingEnhancedModule {}
