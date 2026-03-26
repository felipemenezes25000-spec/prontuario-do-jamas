import { Module } from '@nestjs/common';
import { DeviceIntegrationService } from './device-integration.service';
import { DeviceIntegrationController } from './device-integration.controller';

@Module({
  controllers: [DeviceIntegrationController],
  providers: [DeviceIntegrationService],
  exports: [DeviceIntegrationService],
})
export class DeviceIntegrationModule {}
