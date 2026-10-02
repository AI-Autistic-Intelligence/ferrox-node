import Redis from 'ioredis';
import Redlock, { Lock } from 'redlock';
import { AppLoggerFactory } from '@node-yalc/logger';
export * from './smart-cache';

const logger = AppLoggerFactory('RedisCloudHelper');

export class RedisHelper {
  private client: Redis;
  private redlock: Redlock;

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl);
    
    // Configure Redlock for Distributed Locking
    this.redlock = new Redlock([this.client], {
      driftFactor: 0.01,
      retryCount: 10,
      retryDelay: 200,
      retryJitter: 200,
      automaticExtensionThreshold: 500,
    });

    this.client.on('connect', () => logger.log('Connected to Redis successfully'));
    this.client.on('error', (err) => logger.error(`Redis connection error: ${err.message}`));
  }

  /**
   * Acquire a Distributed Lock to prevent race conditions across microservices
   */
  async acquireLock(resource: string, ttlMs: number): Promise<Lock> {
    logger.debug?.(`[Redis] Acquiring lock for resource: ${resource} (${ttlMs}ms)`);
    return this.redlock.acquire([resource], ttlMs);
  }

  /**
   * Caches a value with a specific TTL
   */
  async setCache(key: string, value: any, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.client.set(key, serialized, 'EX', ttlSeconds);
  }

  /**
   * Retrieves a cached value
   */
  async getCache<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async close() {
    await this.client.quit();
  }
}
