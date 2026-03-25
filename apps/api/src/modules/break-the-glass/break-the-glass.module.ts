import { Module } from '@nestjs/common';
import { BreakTheGlassController } from './break-the-glass.controller';
import { BreakTheGlassService } from './break-the-glass.service';

@Module({
  controllers: [BreakTheGlassController],
  providers: [BreakTheGlassService],
  exports: [BreakTheGlassService],
})
export class BreakTheGlassModule {}
