import { Module } from '@nestjs/common';
import { CardiologyService } from './cardiology.service';
import { CardiologyController } from './cardiology.controller';

@Module({
  controllers: [CardiologyController],
  providers: [CardiologyService],
  exports: [CardiologyService],
})
export class CardiologyModule {}
