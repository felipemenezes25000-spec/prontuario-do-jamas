import { Module } from '@nestjs/common';
import { AiRevolutionaryController } from './ai-revolutionary.controller';
import { AiRevolutionaryService } from './ai-revolutionary.service';

@Module({
  controllers: [AiRevolutionaryController],
  providers: [AiRevolutionaryService],
  exports: [AiRevolutionaryService],
})
export class AiRevolutionaryModule {}
