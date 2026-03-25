import { Module } from '@nestjs/common';
import { InteropBrazilService } from './interop-brazil.service';
import { InteropBrazilController } from './interop-brazil.controller';

@Module({
  controllers: [InteropBrazilController],
  providers: [InteropBrazilService],
  exports: [InteropBrazilService],
})
export class InteropBrazilModule {}
