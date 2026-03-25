import { Module } from '@nestjs/common';
import { TransferCenterController } from './transfer-center.controller';
import { TransferCenterService } from './transfer-center.service';

@Module({
  controllers: [TransferCenterController],
  providers: [TransferCenterService],
  exports: [TransferCenterService],
})
export class TransferCenterModule {}
