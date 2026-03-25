import { Module } from '@nestjs/common';
import { CodingAutomationService } from './coding-automation.service';
import { CodingAutomationController } from './coding-automation.controller';

@Module({
  controllers: [CodingAutomationController],
  providers: [CodingAutomationService],
  exports: [CodingAutomationService],
})
export class CodingAutomationModule {}
