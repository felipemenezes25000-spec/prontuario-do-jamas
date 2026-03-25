import { Module } from '@nestjs/common';
import { ChestPainService } from './chest-pain.service';
import { ChestPainController } from './chest-pain.controller';

@Module({
  controllers: [ChestPainController],
  providers: [ChestPainService],
  exports: [ChestPainService],
})
export class ChestPainModule {}
