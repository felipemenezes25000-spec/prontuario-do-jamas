import { Module } from '@nestjs/common';
import { NursingService } from './nursing.service';
import { NursingController } from './nursing.controller';
import { NursingEnhancedService } from './nursing-enhanced.service';
import { NursingEnhancedController } from './nursing-enhanced.controller';

@Module({
  controllers: [NursingController, NursingEnhancedController],
  providers: [NursingService, NursingEnhancedService],
  exports: [NursingService, NursingEnhancedService],
})
export class NursingModule {}
