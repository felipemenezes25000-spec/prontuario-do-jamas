import { Module } from '@nestjs/common';
import { LisService } from './lis.service';
import { LisController } from './lis.controller';
import { LisSampleTrackingService } from './lis-sample-tracking.service';
import { LisSampleTrackingController } from './lis-sample-tracking.controller';
import { LisLabEnhancedService } from './lis-lab-enhanced.service';
import { LisLabEnhancedController } from './lis-lab-enhanced.controller';

@Module({
  controllers: [LisController, LisSampleTrackingController, LisLabEnhancedController],
  providers: [LisService, LisSampleTrackingService, LisLabEnhancedService],
  exports: [LisService, LisSampleTrackingService, LisLabEnhancedService],
})
export class LisModule {}
