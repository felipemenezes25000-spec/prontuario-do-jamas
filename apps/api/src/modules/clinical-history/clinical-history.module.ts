import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

import { ProblemListController } from './problem-list.controller';
import { ProblemListService } from './problem-list.service';

import { HomeMedicationsController } from './home-medications.controller';
import { HomeMedicationsService } from './home-medications.service';

import { ObstetricHistoryController } from './obstetric-history.controller';
import { ObstetricHistoryService } from './obstetric-history.service';

import { TransfusionHistoryController } from './transfusion-history.controller';
import { TransfusionHistoryService } from './transfusion-history.service';

import { ImplantedDevicesController } from './implanted-devices.controller';
import { ImplantedDevicesService } from './implanted-devices.service';

import { ClinicalTimelineController } from './clinical-timeline.controller';
import { ClinicalTimelineService } from './clinical-timeline.service';

import { ClinicalHistoryController } from './clinical-history.controller';
import { ClinicalHistoryService } from './clinical-history.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    ClinicalHistoryController,
    ProblemListController,
    HomeMedicationsController,
    ObstetricHistoryController,
    TransfusionHistoryController,
    ImplantedDevicesController,
    ClinicalTimelineController,
  ],
  providers: [
    ClinicalHistoryService,
    ProblemListService,
    HomeMedicationsService,
    ObstetricHistoryService,
    TransfusionHistoryService,
    ImplantedDevicesService,
    ClinicalTimelineService,
  ],
  exports: [
    ClinicalHistoryService,
    ProblemListService,
    HomeMedicationsService,
    ObstetricHistoryService,
    TransfusionHistoryService,
    ImplantedDevicesService,
    ClinicalTimelineService,
  ],
})
export class ClinicalHistoryModule {}
