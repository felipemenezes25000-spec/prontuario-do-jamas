import { Module } from '@nestjs/common';
import { CmeController } from './cme.controller';
import { CmeService } from './cme.service';

@Module({
  controllers: [CmeController],
  providers: [CmeService],
  exports: [CmeService],
})
export class CmeModule {}
