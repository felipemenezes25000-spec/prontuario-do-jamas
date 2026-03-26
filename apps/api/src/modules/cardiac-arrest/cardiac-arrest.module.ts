import { Module } from '@nestjs/common';
import { CardiacArrestService } from './cardiac-arrest.service';
import { CardiacArrestController } from './cardiac-arrest.controller';

@Module({
  controllers: [CardiacArrestController],
  providers: [CardiacArrestService],
  exports: [CardiacArrestService],
})
export class CardiacArrestModule {}
