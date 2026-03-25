import { Module } from '@nestjs/common';
import { AntimicrobialStewardshipService } from './antimicrobial-stewardship.service';
import { AntimicrobialStewardshipController } from './antimicrobial-stewardship.controller';

@Module({
  controllers: [AntimicrobialStewardshipController],
  providers: [AntimicrobialStewardshipService],
  exports: [AntimicrobialStewardshipService],
})
export class AntimicrobialStewardshipModule {}
