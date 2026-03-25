import { Module } from '@nestjs/common';
import { EquipmentMaintenanceController } from './equipment-maintenance.controller';
import { EquipmentMaintenanceService } from './equipment-maintenance.service';

@Module({
  controllers: [EquipmentMaintenanceController],
  providers: [EquipmentMaintenanceService],
  exports: [EquipmentMaintenanceService],
})
export class EquipmentMaintenanceModule {}
