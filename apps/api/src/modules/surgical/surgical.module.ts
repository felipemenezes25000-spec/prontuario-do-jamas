import { Module } from '@nestjs/common';
import { SurgicalService } from './surgical.service';
import { SurgicalController } from './surgical.controller';

@Module({
  controllers: [SurgicalController],
  providers: [SurgicalService],
  exports: [SurgicalService],
})
export class SurgicalModule {}
