import { Module } from '@nestjs/common';
import { AdmissionsService } from './admissions.service';
import { BedsService } from './beds.service';
import { AdmissionsController } from './admissions.controller';

@Module({
  controllers: [AdmissionsController],
  providers: [AdmissionsService, BedsService],
  exports: [AdmissionsService, BedsService],
})
export class AdmissionsModule {}
