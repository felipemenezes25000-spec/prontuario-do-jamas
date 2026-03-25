import { Module } from '@nestjs/common';
import { SpeechTherapyController } from './speech-therapy.controller';
import { SpeechTherapyService } from './speech-therapy.service';

@Module({
  controllers: [SpeechTherapyController],
  providers: [SpeechTherapyService],
  exports: [SpeechTherapyService],
})
export class SpeechTherapyModule {}
