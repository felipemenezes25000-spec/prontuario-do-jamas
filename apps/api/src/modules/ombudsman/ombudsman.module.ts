import { Module } from '@nestjs/common';
import { OmbudsmanService } from './ombudsman.service';
import { OmbudsmanController } from './ombudsman.controller';

@Module({
  controllers: [OmbudsmanController],
  providers: [OmbudsmanService],
  exports: [OmbudsmanService],
})
export class OmbudsmanModule {}
