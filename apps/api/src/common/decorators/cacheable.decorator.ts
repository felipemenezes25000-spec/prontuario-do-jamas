import { Inject } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

export const CACHE_SERVICE = 'CACHE_SERVICE';

/**
 * Method decorator that caches the return value in Redis.
 * The cache key is built from `keyPrefix` + serialized method arguments.
 */
export function Cacheable(keyPrefix: string, ttlSeconds: number): MethodDecorator {
  const injectCache = Inject(CacheService);

  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    injectCache(target, '__cacheService');

    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;

    descriptor.value = async function (this: Record<string, unknown>, ...args: unknown[]) {
      const cacheService = this['__cacheService'] as CacheService | undefined;
      if (!cacheService) {
        return originalMethod.apply(this, args);
      }

      const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;
      const cached = await cacheService.get<unknown>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      await cacheService.set(cacheKey, result, ttlSeconds);
      return result;
    };

    return descriptor;
  };
}
