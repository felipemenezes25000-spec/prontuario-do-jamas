import { Module } from '@nestjs/common';
import { ClinicalPathwaysService } from './clinical-pathways.service';
import { ClinicalPathwaysController } from './clinical-pathways.controller';

@Module({
  controllers: [ClinicalPathwaysController],
  providers: [ClinicalPathwaysService],
  exports: [ClinicalPathwaysService],
})
export class ClinicalPathwaysModule {}
