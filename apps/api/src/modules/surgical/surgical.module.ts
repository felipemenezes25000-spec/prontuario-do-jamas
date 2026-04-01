import { Module } from '@nestjs/common';
import { SurgicalService } from './surgical.service';
import { SurgicalController } from './surgical.controller';
import { SurgicalEnhancedService } from './surgical-enhanced.service';
import { SurgicalEnhancedController } from './surgical-enhanced.controller';
import { SurgicalSafetyService } from './surgical-safety.service';
import { SurgicalSafetyController } from './surgical-safety.controller';

@Module({
  controllers: [SurgicalController, SurgicalEnhancedController, SurgicalSafetyController],
  providers: [SurgicalService, SurgicalEnhancedService, SurgicalSafetyService],
  exports: [SurgicalService, SurgicalEnhancedService, SurgicalSafetyService],
})
export class SurgicalModule {}
