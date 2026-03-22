import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class AiCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(AiCacheService.name);
  private redis: Redis | null = null;

  constructor(private readonly config: ConfigService) {
    const redisUrl = this.config.get<string>('redis.url');
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          connectTimeout: 5000,
        });
        this.redis
          .connect()
          .then(() => this.logger.log('AI cache connected to Redis'))
          .catch(() => {
            this.logger.warn('Redis not available — AI cache disabled');
            this.redis = null;
          });
      } catch {
        this.logger.warn('Redis not available — AI cache disabled');
        this.redis = null;
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit().catch(() => {
        /* ignore */
      });
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    try {
      const data = await this.redis.get(`ai:${key}`);
      return data ? (JSON.parse(data) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.setex(`ai:${key}`, ttlSeconds, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }

  async invalidate(pattern: string): Promise<void> {
    if (!this.redis) return;
    try {
      const keys = await this.redis.keys(`ai:${pattern}`);
      if (keys.length > 0) await this.redis.del(...keys);
    } catch {
      /* ignore */
    }
  }
}
