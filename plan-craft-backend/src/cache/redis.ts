/**
 * Cache layer with Redis primary + in-memory fallback
 *
 * When REDIS_URL is set: uses Redis
 * When not set: uses in-memory Map (single-instance only)
 */

export interface CacheInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  type: 'redis' | 'memory';
}

class MemoryCache implements CacheInterface {
  private store = new Map<string, { value: string; expiresAt: number }>();
  public type: 'memory' = 'memory';

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds: number = 3600): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }
}

let cacheInstance: CacheInterface | null = null;

export async function getCache(): Promise<CacheInterface> {
  if (cacheInstance) return cacheInstance;

  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    try {
      // Dynamic import to avoid requiring ioredis when not used
      const { default: Redis } = await import('ioredis');
      const redis = new Redis(redisUrl);

      // Wrap Redis with our interface
      const redisCache: CacheInterface = {
        async get(key: string) {
          return redis.get(key);
        },
        async set(key: string, value: string, ttl: number = 3600) {
          await redis.set(key, value, 'EX', ttl);
        },
        async del(key: string) {
          await redis.del(key);
        },
        async has(key: string) {
          return (await redis.exists(key)) === 1;
        },
        type: 'redis',
      };
      cacheInstance = redisCache;
      console.log('✅ Redis cache connected');
    } catch (e: any) {
      console.warn('⚠️ Redis connection failed, using in-memory cache:', e.message);
      cacheInstance = new MemoryCache();
    }
  } else {
    console.log('ℹ️ No REDIS_URL set, using in-memory cache');
    cacheInstance = new MemoryCache();
  }

  return cacheInstance;
}

// Cache middleware for API responses
export function cacheMiddleware(ttlSeconds: number = 300) {
  return async (c: any, next: any) => {
    const cache = await getCache();
    const key = `api:${c.req.method}:${c.req.url}`;

    const cached = await cache.get(key);
    if (cached) {
      return c.json(JSON.parse(cached));
    }

    await next();

    // Cache successful responses
    if (c.res.status === 200) {
      const body = await c.res.clone().text();
      await cache.set(key, body, ttlSeconds);
    }
  };
}
