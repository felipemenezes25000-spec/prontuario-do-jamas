import { Module } from '@nestjs/common';
import { HospitalServicesController } from './hospital-services.controller';
import { HospitalServicesService } from './hospital-services.service';

@Module({
  controllers: [HospitalServicesController],
  providers: [HospitalServicesService],
  exports: [HospitalServicesService],
})
export class HospitalServicesModule {}
