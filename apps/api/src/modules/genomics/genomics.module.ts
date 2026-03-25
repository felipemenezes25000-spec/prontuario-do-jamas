import { Module } from '@nestjs/common';
import { GenomicsService } from './genomics.service';
import { GenomicsController } from './genomics.controller';

@Module({
  controllers: [GenomicsController],
  providers: [GenomicsService],
  exports: [GenomicsService],
})
export class GenomicsModule {}
