import { Module } from '@nestjs/common';
import { OnlineSchedulingService } from './online-scheduling.service';
import { OnlineSchedulingController } from './online-scheduling.controller';

@Module({
  controllers: [OnlineSchedulingController],
  providers: [OnlineSchedulingService],
  exports: [OnlineSchedulingService],
})
export class OnlineSchedulingModule {}
