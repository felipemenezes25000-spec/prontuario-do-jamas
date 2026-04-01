import { Module } from '@nestjs/common';
import { InteropBrazilService } from './interop-brazil.service';
import { InteropBrazilController } from './interop-brazil.controller';
import { BrazilIntegrationsService } from './brazil-integrations.service';
import { BrazilIntegrationsController } from './brazil-integrations.controller';
import { BrazilIntegrationsExtendedService } from './brazil-integrations-extended.service';
import { BrazilIntegrationsExtendedController } from './brazil-integrations-extended.controller';
import { DatasusIntegrationsService } from './datasus-integrations.service';
import { DatasusIntegrationsController } from './datasus-integrations.controller';

@Module({
  controllers: [
    InteropBrazilController,
    BrazilIntegrationsController,
    BrazilIntegrationsExtendedController,
    DatasusIntegrationsController,
  ],
  providers: [
    InteropBrazilService,
    BrazilIntegrationsService,
    BrazilIntegrationsExtendedService,
    DatasusIntegrationsService,
  ],
  exports: [
    InteropBrazilService,
    BrazilIntegrationsService,
    BrazilIntegrationsExtendedService,
    DatasusIntegrationsService,
  ],
})
export class InteropBrazilModule {}
