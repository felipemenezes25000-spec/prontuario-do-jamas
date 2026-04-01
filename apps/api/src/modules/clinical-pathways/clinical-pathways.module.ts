import { Module } from '@nestjs/common';
import { ClinicalPathwaysService } from './clinical-pathways.service';
import { ClinicalPathwaysController } from './clinical-pathways.controller';
import { ClinicalPathwaysAdvancedController } from './clinical-pathways-advanced.controller';
import { ClinicalPathwaysAdvancedService } from './clinical-pathways-advanced.service';

@Module({
  controllers: [ClinicalPathwaysController, ClinicalPathwaysAdvancedController],
  providers: [ClinicalPathwaysService, ClinicalPathwaysAdvancedService],
  exports: [ClinicalPathwaysService, ClinicalPathwaysAdvancedService],
})
export class ClinicalPathwaysModule {}
