import { Module } from '@nestjs/common';
import { ClinicalDecisionController } from './clinical-decision.controller';
import { ClinicalDecisionService } from './clinical-decision.service';

@Module({
  controllers: [ClinicalDecisionController],
  providers: [ClinicalDecisionService],
  exports: [ClinicalDecisionService],
})
export class ClinicalDecisionModule {}
