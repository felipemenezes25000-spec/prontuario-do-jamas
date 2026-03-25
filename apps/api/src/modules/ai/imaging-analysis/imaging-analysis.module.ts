import { Module } from '@nestjs/common';
import { ImagingAnalysisController } from './imaging-analysis.controller';
import { ImagingAnalysisService } from './imaging-analysis.service';

@Module({
  controllers: [ImagingAnalysisController],
  providers: [ImagingAnalysisService],
  exports: [ImagingAnalysisService],
})
export class ImagingAnalysisModule {}
