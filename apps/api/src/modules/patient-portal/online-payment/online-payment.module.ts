import { Module } from '@nestjs/common';
import { OnlinePaymentService } from './online-payment.service';
import { OnlinePaymentController } from './online-payment.controller';

@Module({
  controllers: [OnlinePaymentController],
  providers: [OnlinePaymentService],
  exports: [OnlinePaymentService],
})
export class OnlinePaymentModule {}
