import { Module } from '@nestjs/common';
import { IcuService } from './icu.service';
import { IcuController } from './icu.controller';
import { IcuScoresService } from './icu-scores.service';
import { IcuScoresController } from './icu-scores.controller';
import { IcuVentilationService } from './icu-ventilation.service';
import { IcuVentilationController } from './icu-ventilation.controller';
import { IcuManagementService } from './icu-management.service';
import { IcuManagementController } from './icu-management.controller';

@Module({
  controllers: [
    IcuController,
    IcuScoresController,
    IcuVentilationController,
    IcuManagementController,
  ],
  providers: [
    IcuService,
    IcuScoresService,
    IcuVentilationService,
    IcuManagementService,
  ],
  exports: [
    IcuService,
    IcuScoresService,
    IcuVentilationService,
    IcuManagementService,
  ],
})
export class IcuModule {}
