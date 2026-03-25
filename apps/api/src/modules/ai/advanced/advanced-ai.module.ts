import { Module } from '@nestjs/common';
import { AdvancedAiController } from './advanced-ai.controller';
import { AdvancedAiService } from './advanced-ai.service';

@Module({
  controllers: [AdvancedAiController],
  providers: [AdvancedAiService],
  exports: [AdvancedAiService],
})
export class AdvancedAiModule {}
