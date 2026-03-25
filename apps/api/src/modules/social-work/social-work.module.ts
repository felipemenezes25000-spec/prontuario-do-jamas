import { Module } from '@nestjs/common';
import { SocialWorkController } from './social-work.controller';
import { SocialWorkService } from './social-work.service';

@Module({
  controllers: [SocialWorkController],
  providers: [SocialWorkService],
  exports: [SocialWorkService],
})
export class SocialWorkModule {}
