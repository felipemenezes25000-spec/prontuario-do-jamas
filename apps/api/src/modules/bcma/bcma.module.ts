import { Module } from '@nestjs/common';
import { BcmaService } from './bcma.service';
import { BcmaController } from './bcma.controller';

@Module({
  controllers: [BcmaController],
  providers: [BcmaService],
  exports: [BcmaService],
})
export class BcmaModule {}
