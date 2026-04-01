import { Module } from '@nestjs/common';
import { LisService } from './lis.service';
import { LisController } from './lis.controller';
import { LisSampleTrackingService } from './lis-sample-tracking.service';
import { LisSampleTrackingController } from './lis-sample-tracking.controller';

@Module({
  controllers: [LisController, LisSampleTrackingController],
  providers: [LisService, LisSampleTrackingService],
  exports: [LisService, LisSampleTrackingService],
})
export class LisModule {}
