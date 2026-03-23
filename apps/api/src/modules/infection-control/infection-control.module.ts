import { Module } from '@nestjs/common';
import { InfectionControlService } from './infection-control.service';
import { InfectionControlController } from './infection-control.controller';

@Module({
  controllers: [InfectionControlController],
  providers: [InfectionControlService],
  exports: [InfectionControlService],
})
export class InfectionControlModule {}
