import { Module } from '@nestjs/common';
import { ChargeCaptureService } from './charge-capture.service';
import { ChargeCaptureController } from './charge-capture.controller';

@Module({
  controllers: [ChargeCaptureController],
  providers: [ChargeCaptureService],
  exports: [ChargeCaptureService],
})
export class ChargeCaptureModule {}
