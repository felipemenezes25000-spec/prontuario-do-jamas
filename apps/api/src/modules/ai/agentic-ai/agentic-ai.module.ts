import { Module } from '@nestjs/common';
import { AgenticAiController } from './agentic-ai.controller';
import { AgenticAiService } from './agentic-ai.service';

@Module({
  controllers: [AgenticAiController],
  providers: [AgenticAiService],
  exports: [AgenticAiService],
})
export class AgenticAiModule {}
