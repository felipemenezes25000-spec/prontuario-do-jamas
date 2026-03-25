import { Module } from '@nestjs/common';
import { CredentialingController } from './credentialing.controller';
import { CredentialingService } from './credentialing.service';

@Module({
  controllers: [CredentialingController],
  providers: [CredentialingService],
  exports: [CredentialingService],
})
export class CredentialingModule {}
