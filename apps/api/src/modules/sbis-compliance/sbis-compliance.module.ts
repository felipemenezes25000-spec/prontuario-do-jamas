import { Module } from '@nestjs/common';
import { SbisComplianceController, CfmComplianceController } from './sbis-compliance.controller';
import { SbisComplianceService } from './sbis-compliance.service';

@Module({
  controllers: [SbisComplianceController, CfmComplianceController],
  providers: [SbisComplianceService],
  exports: [SbisComplianceService],
})
export class SbisComplianceModule {}
