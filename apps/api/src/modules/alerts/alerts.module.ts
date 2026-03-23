import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertRulesService } from './alert-rules.service';
import { AlertsController } from './alerts.controller';

@Module({
  controllers: [AlertsController],
  providers: [AlertsService, AlertRulesService],
  exports: [AlertsService, AlertRulesService],
})
export class AlertsModule {}
