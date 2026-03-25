import { Module } from '@nestjs/common';
import { TelemedicineEnhancedService } from './telemedicine-enhanced.service';
import { TelemedicineEnhancedController } from './telemedicine-enhanced.controller';

@Module({
  controllers: [TelemedicineEnhancedController],
  providers: [TelemedicineEnhancedService],
  exports: [TelemedicineEnhancedService],
})
export class TelemedicineEnhancedModule {}
