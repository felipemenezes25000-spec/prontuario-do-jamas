import { Module } from '@nestjs/common';
import { ClinicalResearchController } from './clinical-research.controller';
import { ClinicalResearchService } from './clinical-research.service';

@Module({
  controllers: [ClinicalResearchController],
  providers: [ClinicalResearchService],
  exports: [ClinicalResearchService],
})
export class ClinicalResearchModule {}
