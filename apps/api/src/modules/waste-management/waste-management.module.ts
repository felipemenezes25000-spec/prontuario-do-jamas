import { Module } from '@nestjs/common';
import { WasteManagementService } from './waste-management.service';
import { WasteManagementController } from './waste-management.controller';

@Module({
  controllers: [WasteManagementController],
  providers: [WasteManagementService],
  exports: [WasteManagementService],
})
export class WasteManagementModule {}
