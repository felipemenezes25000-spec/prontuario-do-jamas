import { Module } from '@nestjs/common';
import { VitalSignsService } from './vital-signs.service';
import { VitalSignsController } from './vital-signs.controller';
import { NEWSScoreService } from './news-score.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
  controllers: [VitalSignsController],
  providers: [VitalSignsService, NEWSScoreService],
  exports: [VitalSignsService, NEWSScoreService],
})
export class VitalSignsModule {}
