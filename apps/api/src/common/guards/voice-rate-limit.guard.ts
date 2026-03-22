import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { VOICE_RATE_LIMIT_KEY } from '../decorators/voice-rate-limit.decorator';

@Injectable()
export class VoiceRateLimitGuard implements CanActivate {
  private readonly redis: Redis;
  private readonly logger = new Logger(VoiceRateLimitGuard.name);

  /** Maximum audio seconds allowed per user per day (60 minutes) */
  private readonly MAX_AUDIO_SECONDS_PER_DAY = 3600;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis(
      this.config.get<string>('redis.url') || 'redis://localhost:6379',
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isVoiceRateLimited = this.reflector.get<boolean>(
      VOICE_RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!isVoiceRateLimited) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub ?? request.user?.id;

    if (!userId) {
      return false;
    }

    const today = new Date().toISOString().split('T')[0];
    const key = `voice:daily:${userId}:${today}`;
    const currentSeconds = parseInt((await this.redis.get(key)) || '0', 10);

    if (currentSeconds >= this.MAX_AUDIO_SECONDS_PER_DAY) {
      this.logger.warn(
        `User ${userId} exceeded daily voice limit (${currentSeconds}s / ${this.MAX_AUDIO_SECONDS_PER_DAY}s)`,
      );
      throw new HttpException(
        'Limite diário de gravação de voz atingido (60 minutos). Tente novamente amanhã.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Track audio duration consumed by a user.
   * Call this after a successful audio upload or transcription.
   */
  async trackAudioDuration(
    userId: string,
    durationSeconds: number,
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const key = `voice:daily:${userId}:${today}`;

    await this.redis.incrby(key, Math.ceil(durationSeconds));
    await this.redis.expire(key, 86400); // TTL 24h
  }

  /**
   * Get remaining seconds for a user today.
   */
  async getRemainingSeconds(userId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const key = `voice:daily:${userId}:${today}`;
    const used = parseInt((await this.redis.get(key)) || '0', 10);
    return Math.max(0, this.MAX_AUDIO_SECONDS_PER_DAY - used);
  }
}
