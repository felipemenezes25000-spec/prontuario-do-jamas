import { Module } from '@nestjs/common';
import { NursingService } from './nursing.service';
import { NursingController } from './nursing.controller';
import { NursingEnhancedService } from './nursing-enhanced.service';
import { NursingEnhancedController } from './nursing-enhanced.controller';
import { NursingAssessmentsService } from './nursing-assessments.service';
import { NursingAssessmentsController } from './nursing-assessments.controller';
import { NursingScalesService } from './nursing-scales.service';
import { NursingScalesController } from './nursing-scales.controller';

@Module({
  controllers: [NursingController, NursingEnhancedController, NursingAssessmentsController, NursingScalesController],
  providers: [NursingService, NursingEnhancedService, NursingAssessmentsService, NursingScalesService],
  exports: [NursingService, NursingEnhancedService, NursingAssessmentsService, NursingScalesService],
})
export class NursingModule {}
