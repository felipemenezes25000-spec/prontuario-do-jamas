import { Module } from '@nestjs/common';
import { ArrhythmiaDetectionController } from './arrhythmia-detection.controller';
import { ArrhythmiaDetectionService } from './arrhythmia-detection.service';

@Module({
  controllers: [ArrhythmiaDetectionController],
  providers: [ArrhythmiaDetectionService],
  exports: [ArrhythmiaDetectionService],
})
export class ArrhythmiaDetectionModule {}
