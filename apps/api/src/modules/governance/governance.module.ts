import { Module } from '@nestjs/common';
import { GovernanceController } from './governance.controller';
import { GovernanceService } from './governance.service';
import { GovernanceAdvancedController } from './governance-advanced.controller';
import { GovernanceAdvancedService } from './governance-advanced.service';
import { GovernanceEnhancedService } from './governance-enhanced.service';

@Module({
  controllers: [GovernanceController, GovernanceAdvancedController],
  providers: [GovernanceService, GovernanceAdvancedService, GovernanceEnhancedService],
  exports: [GovernanceService, GovernanceAdvancedService, GovernanceEnhancedService],
})
export class GovernanceModule {}
