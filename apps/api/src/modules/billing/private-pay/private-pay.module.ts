import { Module } from '@nestjs/common';
import { PrivatePayService } from './private-pay.service';
import { PrivatePayController } from './private-pay.controller';

@Module({
  controllers: [PrivatePayController],
  providers: [PrivatePayService],
  exports: [PrivatePayService],
})
export class PrivatePayModule {}
