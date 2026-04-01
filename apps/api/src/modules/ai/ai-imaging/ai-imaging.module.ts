import { Module } from '@nestjs/common';
import { AiImagingController } from './ai-imaging.controller';
import { AiImagingService } from './ai-imaging.service';

@Module({
  controllers: [AiImagingController],
  providers: [AiImagingService],
  exports: [AiImagingService],
})
export class AiImagingModule {}
