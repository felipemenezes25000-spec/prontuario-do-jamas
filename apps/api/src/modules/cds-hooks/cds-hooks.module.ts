import { Module } from '@nestjs/common';
import { CdsHooksService } from './cds-hooks.service';
import { CdsHooksController } from './cds-hooks.controller';

@Module({
  controllers: [CdsHooksController],
  providers: [CdsHooksService],
  exports: [CdsHooksService],
})
export class CdsHooksModule {}
