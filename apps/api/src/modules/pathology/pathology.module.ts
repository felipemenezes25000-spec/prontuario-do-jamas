import { Module } from '@nestjs/common';
import { PathologyService } from './pathology.service';
import { PathologyController } from './pathology.controller';

@Module({
  controllers: [PathologyController],
  providers: [PathologyService],
  exports: [PathologyService],
})
export class PathologyModule {}
