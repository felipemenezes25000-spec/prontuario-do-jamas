import { Module } from '@nestjs/common';
import { WoundCareService } from './wound-care.service';
import { WoundCareController } from './wound-care.controller';

@Module({
  controllers: [WoundCareController],
  providers: [WoundCareService],
  exports: [WoundCareService],
})
export class WoundCareModule {}
