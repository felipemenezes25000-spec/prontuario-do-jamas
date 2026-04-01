import { Module } from '@nestjs/common';
import { InteropBrazilService } from './interop-brazil.service';
import { InteropBrazilController } from './interop-brazil.controller';
import { BrazilIntegrationsService } from './brazil-integrations.service';
import { BrazilIntegrationsController } from './brazil-integrations.controller';
import { DatasusIntegrationsService } from './datasus-integrations.service';
import { DatasusIntegrationsController } from './datasus-integrations.controller';

@Module({
  controllers: [
    InteropBrazilController,
    BrazilIntegrationsController,
    DatasusIntegrationsController,
  ],
  providers: [
    InteropBrazilService,
    BrazilIntegrationsService,
    DatasusIntegrationsService,
  ],
  exports: [
    InteropBrazilService,
    BrazilIntegrationsService,
    DatasusIntegrationsService,
  ],
})
export class InteropBrazilModule {}
