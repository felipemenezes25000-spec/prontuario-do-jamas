import { Module } from '@nestjs/common';
import { MedicalCalculatorsService } from './medical-calculators.service';
import { MedicalCalculatorsController } from './medical-calculators.controller';

@Module({
  controllers: [MedicalCalculatorsController],
  providers: [MedicalCalculatorsService],
  exports: [MedicalCalculatorsService],
})
export class MedicalCalculatorsModule {}
