import { Module } from '@nestjs/common';
import { DrgService } from './drg.service';
import { DrgController } from './drg.controller';

@Module({
  controllers: [DrgController],
  providers: [DrgService],
  exports: [DrgService],
})
export class DrgModule {}
