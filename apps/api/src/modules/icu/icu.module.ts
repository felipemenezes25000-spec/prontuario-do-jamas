import { Module } from '@nestjs/common';
import { IcuService } from './icu.service';
import { IcuController } from './icu.controller';

@Module({
  controllers: [IcuController],
  providers: [IcuService],
  exports: [IcuService],
})
export class IcuModule {}
