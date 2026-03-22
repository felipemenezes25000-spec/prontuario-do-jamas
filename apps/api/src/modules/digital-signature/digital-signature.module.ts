import { Module } from '@nestjs/common';
import { DigitalSignatureService } from './digital-signature.service';
import { DigitalSignatureController } from './digital-signature.controller';

/**
 * Digital Signature Module — ICP-Brasil PKI Integration
 *
 * Provides digital signature capabilities for clinical documents,
 * notes, and prescriptions per CFM Resolution 2.299/2021.
 */
@Module({
  controllers: [DigitalSignatureController],
  providers: [DigitalSignatureService],
  exports: [DigitalSignatureService],
})
export class DigitalSignatureModule {}
