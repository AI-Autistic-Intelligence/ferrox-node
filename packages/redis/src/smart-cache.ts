import { RedisHelper } from './index';
import { AppLoggerFactory } from '@node-yalc/logger';

const logger = AppLoggerFactory('SmartCacheManager');

export interface CacheFetchOptions {
  userId: string;         // Mandatory to prevent returning one user's data to another!
  resourceName: string;   // e.g. 'profile', 'billing'
  ttlSeconds: number;
  fetcher: () => Promise<any>; // The function that actually hits the DB
}

export class SmartCacheManager {
  private inFlightPromises = new Map<string, Promise<any>>();
  private redis: RedisHelper;

  constructor(redisHelper: RedisHelper) {
    this.redis = redisHelper;
  }

  /**
   * Generates a hyper-strict, isolated cache key.
   */
  private generateKey(userId: string, resourceName: string): string {
    return `ferrox:cache:user:${userId}:res:${resourceName}`;
  }

  /**
   * Fetches data with Thundering Herd & Cache Stampede Protection (Multi-tier).
   * 1. In-Memory Promise Deduplication (Single-Node Lock)
   * 2. Redis Distributed Lock (Multi-Node Lock)
   */
  public async getOrFetch<T>(options: CacheFetchOptions): Promise<T> {
    const cacheKey = this.generateKey(options.userId, options.resourceName);

    // TIER 1: In-Memory Promise Deduplication. 
    // If 10k requests hit THIS node, 9999 will just await the existing promise without hitting Redis or DB!
    if (this.inFlightPromises.has(cacheKey)) {
      logger?.debug?.(`[Cache] Memory multiplex hit for ${cacheKey}. Awaiting existing promise...`);
      return this.inFlightPromises.get(cacheKey) as Promise<T>;
    }

    const fetchPromise = this.internalFetch<T>(cacheKey, options);
    this.inFlightPromises.set(cacheKey, fetchPromise);

    try {
      return await fetchPromise;
    } finally {
      // Always cleanup the in-flight promise regardless of success or failure
      this.inFlightPromises.delete(cacheKey);
    }
  }

  private async internalFetch<T>(cacheKey: string, options: CacheFetchOptions): Promise<T> {
    // TIER 2: Check Redis Cache
    const cachedValue = await this.redis.getCache<T>(cacheKey);
    if (cachedValue) {
      logger?.debug?.(`[Cache] Redis hit for ${cacheKey}`);
      return cachedValue;
    }

    // TIER 3: Redis Distributed Lock (Cache Stampede Protection across multiple Node instances)
    const lockKey = `lock:${cacheKey}`;
    logger?.debug?.(`[Cache] Cache miss for ${cacheKey}. Attempting to acquire distributed DB lock...`);
    
    let lock;
    try {
      // Only 1 node across the whole cluster gets the lock. Others will fail and fallback
      lock = await this.redis.acquireLock(lockKey, 5000); // 5 sec lock
    } catch (err) {
      // Failed to acquire lock (another node is fetching). 
      // We must wait a bit and retry reading from cache!
      logger.warn(`[Cache] Lock busy for ${cacheKey}. Another instance is fetching. Waiting and retrying...`);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const retryCache = await this.redis.getCache<T>(cacheKey);
      if (retryCache) return retryCache;
      
      throw new Error(`Timeout waiting for cache resolution on ${cacheKey}`);
    }

    // We hold the lock! Hit the DB.
    try {
      logger?.debug?.(`[Cache] Lock acquired. Executing DB fetcher for ${cacheKey}`);
      const freshData = await options.fetcher();
      
      // Store in Redis
      await this.redis.setCache(cacheKey, freshData, options.ttlSeconds);
      
      return freshData;
    } catch (err: any) {
      logger.error(`[Cache] Fetcher failed for ${cacheKey}: ${err.message}`);
      throw err;
    } finally {
      // Always release the lock
      await lock.release().catch(e => logger.warn(`[Cache] Error releasing lock: ${e.message}`));
    }
  }
}

