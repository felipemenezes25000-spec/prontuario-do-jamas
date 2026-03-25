import { Module } from '@nestjs/common';
import { QualityMeasuresService } from './quality-measures.service';
import { QualityMeasuresController } from './quality-measures.controller';

@Module({
  controllers: [QualityMeasuresController],
  providers: [QualityMeasuresService],
  exports: [QualityMeasuresService],
})
export class QualityMeasuresModule {}
