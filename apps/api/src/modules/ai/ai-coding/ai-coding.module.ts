import { Module } from '@nestjs/common';
import { AiCodingController } from './ai-coding.controller';
import { AiCodingService } from './ai-coding.service';

@Module({
  controllers: [AiCodingController],
  providers: [AiCodingService],
  exports: [AiCodingService],
})
export class AiCodingModule {}
