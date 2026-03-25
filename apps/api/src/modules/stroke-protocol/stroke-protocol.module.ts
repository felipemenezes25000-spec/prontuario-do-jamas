import { Module } from '@nestjs/common';
import { StrokeProtocolService } from './stroke-protocol.service';
import { StrokeProtocolController } from './stroke-protocol.controller';

@Module({
  controllers: [StrokeProtocolController],
  providers: [StrokeProtocolService],
  exports: [StrokeProtocolService],
})
export class StrokeProtocolModule {}
