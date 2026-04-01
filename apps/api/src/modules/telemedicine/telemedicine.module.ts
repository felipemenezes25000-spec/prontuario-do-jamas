import { Module } from '@nestjs/common';
import { TelemedicineService } from './telemedicine.service';
import { TelemedicineController } from './telemedicine.controller';
import { TelemedicineComprehensiveService } from './telemedicine-comprehensive.service';
import { TelemedicineComprehensiveController } from './telemedicine-comprehensive.controller';
import { TelemedicineAdvancedService } from './telemedicine-advanced.service';
import { TelemedicineAdvancedController } from './telemedicine-advanced.controller';

@Module({
  controllers: [TelemedicineController, TelemedicineComprehensiveController, TelemedicineAdvancedController],
  providers: [TelemedicineService, TelemedicineComprehensiveService, TelemedicineAdvancedService],
  exports: [TelemedicineService, TelemedicineComprehensiveService, TelemedicineAdvancedService],
})
export class TelemedicineModule {}
