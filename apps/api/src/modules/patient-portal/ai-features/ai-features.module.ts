import { Module } from '@nestjs/common';
import { AiFeaturesService } from './ai-features.service';
import { AiFeaturesController } from './ai-features.controller';

@Module({
  controllers: [AiFeaturesController],
  providers: [AiFeaturesService],
  exports: [AiFeaturesService],
})
export class AiFeaturesModule {}
