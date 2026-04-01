import { Module } from '@nestjs/common';
import { AmbientListeningController } from './ambient-listening.controller';
import { AmbientListeningService } from './ambient-listening.service';

@Module({
  controllers: [AmbientListeningController],
  providers: [AmbientListeningService],
  exports: [AmbientListeningService],
})
export class AmbientListeningModule {}
