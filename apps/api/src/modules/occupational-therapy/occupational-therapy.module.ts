import { Module } from '@nestjs/common';
import { OccupationalTherapyController } from './occupational-therapy.controller';
import { OccupationalTherapyService } from './occupational-therapy.service';

@Module({
  controllers: [OccupationalTherapyController],
  providers: [OccupationalTherapyService],
  exports: [OccupationalTherapyService],
})
export class OccupationalTherapyModule {}
