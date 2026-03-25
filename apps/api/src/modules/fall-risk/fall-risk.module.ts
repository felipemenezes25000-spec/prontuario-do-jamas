import { Module } from '@nestjs/common';
import { FallRiskService } from './fall-risk.service';
import { FallRiskController } from './fall-risk.controller';

@Module({
  controllers: [FallRiskController],
  providers: [FallRiskService],
  exports: [FallRiskService],
})
export class FallRiskModule {}
