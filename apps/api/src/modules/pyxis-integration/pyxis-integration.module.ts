import { Module } from '@nestjs/common';
import { PyxisIntegrationService } from './pyxis-integration.service';
import { PyxisIntegrationController } from './pyxis-integration.controller';

@Module({
  controllers: [PyxisIntegrationController],
  providers: [PyxisIntegrationService],
  exports: [PyxisIntegrationService],
})
export class PyxisIntegrationModule {}
