import { Module } from '@nestjs/common';
import { GovernanceController } from './governance.controller';
import { GovernanceService } from './governance.service';
import { GovernanceAdvancedController } from './governance-advanced.controller';
import { GovernanceAdvancedService } from './governance-advanced.service';

@Module({
  controllers: [GovernanceController, GovernanceAdvancedController],
  providers: [GovernanceService, GovernanceAdvancedService],
  exports: [GovernanceService, GovernanceAdvancedService],
})
export class GovernanceModule {}
