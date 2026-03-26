import { Module } from '@nestjs/common';
import { BackupRecoveryService } from './backup-recovery.service';
import { BackupRecoveryController } from './backup-recovery.controller';

@Module({
  controllers: [BackupRecoveryController],
  providers: [BackupRecoveryService],
  exports: [BackupRecoveryService],
})
export class BackupRecoveryModule {}
