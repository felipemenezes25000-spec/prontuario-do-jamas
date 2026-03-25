import { Module } from '@nestjs/common';
import { RisPacsService } from './ris-pacs.service';
import { RisPacsController } from './ris-pacs.controller';

@Module({
  controllers: [RisPacsController],
  providers: [RisPacsService],
  exports: [RisPacsService],
})
export class RisPacsModule {}
