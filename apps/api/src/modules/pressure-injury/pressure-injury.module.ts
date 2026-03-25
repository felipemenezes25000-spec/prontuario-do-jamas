import { Module } from '@nestjs/common';
import { PressureInjuryService } from './pressure-injury.service';
import { PressureInjuryController } from './pressure-injury.controller';

@Module({
  controllers: [PressureInjuryController],
  providers: [PressureInjuryService],
  exports: [PressureInjuryService],
})
export class PressureInjuryModule {}
