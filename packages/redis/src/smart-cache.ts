import { RedisHelper } from './index';
import { AppLoggerFactory } from '@node-yalc/logger';

const logger = AppLoggerFactory('SmartCacheManager');

/**
 * Options for fetching and caching resources using the SmartCacheManager.
 */
export interface CacheFetchOptions {
  /** 
   * Mandatory user identifier. 
   * Enforced to prevent cross-tenant data leakage and ensure strict cache isolation per user. 
   */
  userId: string;
  /** 
   * The name or identifier of the resource being fetched (e.g., 'profile', 'billing'). 
   */
  resourceName: string;
  /** 
   * Time-to-Live (TTL) for the cached item in seconds. 
   */
  ttlSeconds: number;
  /** 
   * The asynchronous function that fetches the data from the primary data store (e.g., Database) 
   * in the event of a cache miss. 
   */
  fetcher: () => Promise<any>;
}

/**
 * Enterprise Smart Cache Manager.
 * 
 * Implements advanced caching patterns to guarantee extreme performance and stability:
 * - **Thundering Herd Protection**: Uses in-memory Promise multiplexing to deduplicate concurrent requests on the same Node.js instance.
 * - **Cache Stampede Prevention**: Utilizes distributed Redis locks (Redlock pattern) to ensure only a single worker across the cluster hits the database when a cache miss occurs.
 * - **Strict Tenant Isolation**: Automatically namespaces cache keys by `userId` to prevent data leakage.
 */
export class SmartCacheManager {
  /** 
   * In-memory multiplexing map to track currently active fetches and prevent duplicate DB queries. 
   */
  private inFlightPromises = new Map<string, Promise<any>>();
  private redis: RedisHelper;

  /**
   * Initializes the SmartCacheManager with a Redis connection helper.
   * @param redisHelper An instance of RedisHelper connected to the cache cluster.
   */
  constructor(redisHelper: RedisHelper) {
    this.redis = redisHelper;
  }

  /**
   * Generates a hyper-strict, isolated cache key scoped by user.
   * @param userId The ID of the user requesting the resource.
   * @param resourceName The resource being requested.
   * @returns {string} A Redis-compatible namespaced key string.
   * @private
   */
  private generateKey(userId: string, resourceName: string): string {
    return `ferrox:cache:user:${userId}:res:${resourceName}`;
  }

  /**
   * Retrieves data from the cache or securely fetches it from the database.
   * Implements a Multi-tier Thundering Herd & Cache Stampede Protection system.
   * 
   * - **Tier 1**: In-Memory Promise Deduplication (Single-Node Lock).
   * - **Tier 2**: Distributed Redis Cache Check.
   * - **Tier 3**: Distributed Redis Lock (Multi-Node Lock) before DB fetch.
   * 
   * @template T The expected type of the data returned.
   * @param {CacheFetchOptions} options The fetch configuration options.
   * @returns {Promise<T>} The requested data, either from cache or freshly fetched.
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

  /**
   * Internal routine for handling Redis checking, locking, and DB fetching.
   * @private
   */
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


