import { Module } from '@nestjs/common';
import { DataWarehouseController } from './data-warehouse.controller';
import { DataWarehouseService } from './data-warehouse.service';

@Module({
  controllers: [DataWarehouseController],
  providers: [DataWarehouseService],
  exports: [DataWarehouseService],
})
export class DataWarehouseModule {}
