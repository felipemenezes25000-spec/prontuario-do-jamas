import { Module } from '@nestjs/common';
import { RisPacsService } from './ris-pacs.service';
import { RisPacsController } from './ris-pacs.controller';
import { RisPacsAdvancedService } from './ris-pacs-advanced.service';
import { RisPacsAdvancedController } from './ris-pacs-advanced.controller';

@Module({
  controllers: [RisPacsController, RisPacsAdvancedController],
  providers: [RisPacsService, RisPacsAdvancedService],
  exports: [RisPacsService, RisPacsAdvancedService],
})
export class RisPacsModule {}
