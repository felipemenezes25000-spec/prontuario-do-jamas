import { Module } from '@nestjs/common';
import { TelemedicineService } from './telemedicine.service';
import { TelemedicineController } from './telemedicine.controller';

@Module({
  controllers: [TelemedicineController],
  providers: [TelemedicineService],
  exports: [TelemedicineService],
})
export class TelemedicineModule {}
