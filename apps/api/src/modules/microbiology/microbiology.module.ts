import { Module } from '@nestjs/common';
import { MicrobiologyService } from './microbiology.service';
import { MicrobiologyController } from './microbiology.controller';

@Module({
  controllers: [MicrobiologyController],
  providers: [MicrobiologyService],
  exports: [MicrobiologyService],
})
export class MicrobiologyModule {}
