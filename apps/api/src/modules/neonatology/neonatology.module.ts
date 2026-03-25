import { Module } from '@nestjs/common';
import { NeonatologyController } from './neonatology.controller';
import { NeonatologyService } from './neonatology.service';

@Module({
  controllers: [NeonatologyController],
  providers: [NeonatologyService],
  exports: [NeonatologyService],
})
export class NeonatologyModule {}
