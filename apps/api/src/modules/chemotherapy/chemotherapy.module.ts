import { Module } from '@nestjs/common';
import { ChemotherapyService } from './chemotherapy.service';
import { ChemotherapyController } from './chemotherapy.controller';

@Module({
  controllers: [ChemotherapyController],
  providers: [ChemotherapyService],
  exports: [ChemotherapyService],
})
export class ChemotherapyModule {}
