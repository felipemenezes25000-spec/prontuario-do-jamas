import { Module } from '@nestjs/common';
import { RndsService } from './rnds.service';
import { RndsController } from './rnds.controller';

@Module({
  controllers: [RndsController],
  providers: [RndsService],
  exports: [RndsService],
})
export class RndsModule {}
