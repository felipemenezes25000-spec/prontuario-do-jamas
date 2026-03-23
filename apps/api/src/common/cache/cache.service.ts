import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get('REDIS_HOST') ?? 'localhost';
    const port = parseInt(this.config.get('REDIS_PORT') ?? '6379', 10);
    const password = this.config.get('REDIS_PASSWORD') || undefined;
    const db = parseInt(this.config.get('REDIS_DB') ?? '0', 10);

    this.redis = new Redis({
      host: String(host),
      port,
      password: password ? String(password) : undefined,
      db,
      keyPrefix: 'voxpep:cache:',
      lazyConnect: true,
    });

    this.redis.connect().catch((err) => {
      this.logger.warn(`Redis cache connection failed: ${String(err)}`);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Cache GET error for key "${key}": ${String(err)}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.set(key, serialized, 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache SET error for key "${key}": ${String(err)}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (err) {
      this.logger.warn(`Cache DEL error for key "${key}": ${String(err)}`);
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(`voxpep:cache:${pattern}`);
      if (keys.length > 0) {
        const stripped = keys.map((k) => k.replace('voxpep:cache:', ''));
        await this.redis.del(...stripped);
      }
    } catch (err) {
      this.logger.warn(`Cache DEL pattern error: ${String(err)}`);
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
