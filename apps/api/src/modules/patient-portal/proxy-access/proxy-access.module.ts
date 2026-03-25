import { Module } from '@nestjs/common';
import { ProxyAccessService } from './proxy-access.service';
import { ProxyAccessController } from './proxy-access.controller';

@Module({
  controllers: [ProxyAccessController],
  providers: [ProxyAccessService],
  exports: [ProxyAccessService],
})
export class ProxyAccessModule {}
