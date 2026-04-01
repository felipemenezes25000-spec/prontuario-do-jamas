import { Module } from '@nestjs/common';
import { HospitalManagementController } from './hospital-management.controller';
import { HospitalManagementService } from './hospital-management.service';

@Module({
  controllers: [HospitalManagementController],
  providers: [HospitalManagementService],
  exports: [HospitalManagementService],
})
export class HospitalManagementModule {}
