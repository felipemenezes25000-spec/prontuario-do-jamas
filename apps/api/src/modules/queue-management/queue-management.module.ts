import { Module } from '@nestjs/common';
import { QueueManagementController } from './queue-management.controller';
import { QueueManagementService } from './queue-management.service';

@Module({
  controllers: [QueueManagementController],
  providers: [QueueManagementService],
  exports: [QueueManagementService],
})
export class QueueManagementModule {}
