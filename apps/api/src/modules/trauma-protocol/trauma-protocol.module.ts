import { Module } from '@nestjs/common';
import { TraumaProtocolService } from './trauma-protocol.service';
import { TraumaProtocolController } from './trauma-protocol.controller';

@Module({
  controllers: [TraumaProtocolController],
  providers: [TraumaProtocolService],
  exports: [TraumaProtocolService],
})
export class TraumaProtocolModule {}
