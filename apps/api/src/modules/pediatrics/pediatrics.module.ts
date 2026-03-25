import { Module } from '@nestjs/common';
import { PediatricsController } from './pediatrics.controller';
import { PediatricsService } from './pediatrics.service';

@Module({
  controllers: [PediatricsController],
  providers: [PediatricsService],
  exports: [PediatricsService],
})
export class PediatricsModule {}
