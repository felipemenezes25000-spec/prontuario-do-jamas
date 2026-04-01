import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { SchedulingAdvancedService } from './scheduling-advanced.service';
import { SchedulingAdvancedController } from './scheduling-advanced.controller';
import { SchedulingEnhancedService } from './scheduling-enhanced.service';
import { SchedulingEnhancedController } from './scheduling-enhanced.controller';

@Module({
  controllers: [AppointmentsController, SchedulingAdvancedController, SchedulingEnhancedController],
  providers: [AppointmentsService, SchedulingAdvancedService, SchedulingEnhancedService],
  exports: [AppointmentsService, SchedulingAdvancedService, SchedulingEnhancedService],
})
export class AppointmentsModule {}
