import { Module } from '@nestjs/common';
import { VitalSignsService } from './vital-signs.service';
import { VitalSignsController } from './vital-signs.controller';
import { NEWSScoreService } from './news-score.service';
import { VitalsScalesService } from './vitals-scales.service';
import { VitalsScalesController } from './vitals-scales.controller';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [VitalSignsController, VitalsScalesController],
  providers: [VitalSignsService, NEWSScoreService, VitalsScalesService],
  exports: [VitalSignsService, NEWSScoreService, VitalsScalesService],
})
export class VitalSignsModule {}
