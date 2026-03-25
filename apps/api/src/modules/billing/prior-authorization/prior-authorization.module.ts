import { Module } from '@nestjs/common';
import { PriorAuthorizationService } from './prior-authorization.service';
import { PriorAuthorizationController } from './prior-authorization.controller';

@Module({
  controllers: [PriorAuthorizationController],
  providers: [PriorAuthorizationService],
  exports: [PriorAuthorizationService],
})
export class PriorAuthorizationModule {}
