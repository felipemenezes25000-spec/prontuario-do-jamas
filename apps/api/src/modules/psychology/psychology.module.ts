import { Module } from '@nestjs/common';
import { PsychologyController } from './psychology.controller';
import { PsychologyService } from './psychology.service';

@Module({
  controllers: [PsychologyController],
  providers: [PsychologyService],
  exports: [PsychologyService],
})
export class PsychologyModule {}
