import { Module } from '@nestjs/common';
import { AccreditationController } from './accreditation.controller';
import { AccreditationService } from './accreditation.service';

@Module({
  controllers: [AccreditationController],
  providers: [AccreditationService],
  exports: [AccreditationService],
})
export class AccreditationModule {}
