import { SetMetadata } from '@nestjs/common';

/** Metadata key for voice rate-limited endpoints */
export const VOICE_RATE_LIMIT_KEY = 'voiceRateLimit';

/**
 * Mark an endpoint as voice-rate-limited.
 * Endpoints decorated with @VoiceRateLimit() enforce a daily cap
 * of 60 minutes of audio per user (tracked via Redis).
 */
export const VoiceRateLimit = () => SetMetadata(VOICE_RATE_LIMIT_KEY, true);
