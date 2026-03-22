import { Module } from '@nestjs/common';
import { LgpdService } from './lgpd.service';
import { LgpdController } from './lgpd.controller';

@Module({
  controllers: [LgpdController],
  providers: [LgpdService],
  exports: [LgpdService],
})
export class LgpdModule {}
