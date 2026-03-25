import { Module } from '@nestjs/common';
import { SepsisService } from './sepsis.service';
import { SepsisController } from './sepsis.controller';

@Module({
  controllers: [SepsisController],
  providers: [SepsisService],
  exports: [SepsisService],
})
export class SepsisModule {}
