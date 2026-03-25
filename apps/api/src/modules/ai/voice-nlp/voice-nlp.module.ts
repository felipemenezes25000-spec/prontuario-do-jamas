import { Module } from '@nestjs/common';
import { VoiceNlpController } from './voice-nlp.controller';
import { VoiceNlpService } from './voice-nlp.service';

@Module({
  controllers: [VoiceNlpController],
  providers: [VoiceNlpService],
  exports: [VoiceNlpService],
})
export class VoiceNlpModule {}
