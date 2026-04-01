import { Module } from '@nestjs/common';
import { ClinicalAiController } from './clinical-ai.controller';
import { ClinicalAiService } from './clinical-ai.service';

@Module({
  controllers: [ClinicalAiController],
  providers: [ClinicalAiService],
  exports: [ClinicalAiService],
})
export class ClinicalAiModule {}
