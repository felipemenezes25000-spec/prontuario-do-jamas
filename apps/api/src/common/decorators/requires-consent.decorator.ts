import { SetMetadata } from '@nestjs/common';
import { ConsentType } from '@prisma/client';

export const REQUIRES_CONSENT_KEY = 'requires_consent';

/**
 * Decorator that marks an endpoint as requiring patient consent.
 * Used with ConsentGuard to enforce LGPD consent requirements.
 *
 * Usage: @RequiresConsent(ConsentType.VOICE_RECORDING)
 */
export const RequiresConsent = (consentType: ConsentType) =>
  SetMetadata(REQUIRES_CONSENT_KEY, consentType);
