import { Module } from '@nestjs/common';
import { CdsEngineService } from './cds-engine.service';
import { CdsEngineController } from './cds-engine.controller';

@Module({
  controllers: [CdsEngineController],
  providers: [CdsEngineService],
  exports: [CdsEngineService],
})
export class CdsEngineModule {}
