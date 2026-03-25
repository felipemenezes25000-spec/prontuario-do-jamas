import { Module } from '@nestjs/common';
import { DigitalCheckinService } from './digital-checkin.service';
import { DigitalCheckinController } from './digital-checkin.controller';

@Module({
  controllers: [DigitalCheckinController],
  providers: [DigitalCheckinService],
  exports: [DigitalCheckinService],
})
export class DigitalCheckinModule {}
