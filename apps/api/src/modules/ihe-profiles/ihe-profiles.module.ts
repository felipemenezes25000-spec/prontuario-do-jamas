import { Module } from '@nestjs/common';
import { IheProfilesService } from './ihe-profiles.service';
import { IheProfilesController } from './ihe-profiles.controller';

@Module({
  controllers: [IheProfilesController],
  providers: [IheProfilesService],
  exports: [IheProfilesService],
})
export class IheProfilesModule {}
