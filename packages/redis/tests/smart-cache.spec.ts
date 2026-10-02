import { SmartCacheManager } from '../src/smart-cache';

describe('SmartCacheManager', () => {
  it('should deduplicate in-flight promises (Cache Stampede Protection)', async () => {
    // Mock RedisHelper
    const mockRedis = {
      getCache: jest.fn().mockResolvedValue(null),
      acquireLock: jest.fn().mockResolvedValue({ release: jest.fn().mockResolvedValue(true) }),
      setCache: jest.fn().mockResolvedValue(true),
    };

    const cache = new SmartCacheManager(mockRedis as any);
    
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return new Promise(r => setTimeout(() => r('DB_DATA'), 50));
    };

    // Fire 5 identical requests concurrently
    const p1 = cache.getOrFetch({ userId: 'u1', resourceName: 'profile', ttlSeconds: 60, fetcher });
    const p2 = cache.getOrFetch({ userId: 'u1', resourceName: 'profile', ttlSeconds: 60, fetcher });
    const p3 = cache.getOrFetch({ userId: 'u1', resourceName: 'profile', ttlSeconds: 60, fetcher });

    const results = await Promise.all([p1, p2, p3]);

    expect(results).toEqual(['DB_DATA', 'DB_DATA', 'DB_DATA']);
    // Important: fetcher should only be called ONCE despite 3 concurrent calls
    expect(fetchCount).toBe(1);
    expect(mockRedis.acquireLock).toHaveBeenCalledTimes(1);
  });

  it('should return from redis if cache hits (Tier 2)', async () => {
    const mockRedis = {
      getCache: jest.fn().mockResolvedValue('CACHED_DATA'),
      acquireLock: jest.fn(),
    };
    const cache = new SmartCacheManager(mockRedis as any);
    const result = await cache.getOrFetch({ userId: 'u2', resourceName: 'profile', ttlSeconds: 60, fetcher: async () => 'DB' });
    expect(result).toBe('CACHED_DATA');
    expect(mockRedis.acquireLock).not.toHaveBeenCalled();
  });

  it('should wait and retry cache if lock is busy (Tier 3 fallback)', async () => {
    let getCacheCalls = 0;
    const mockRedis = {
      getCache: jest.fn().mockImplementation(async () => {
        getCacheCalls++;
        if (getCacheCalls === 1) return null; // First try: miss
        return 'RETRY_CACHED_DATA'; // Second try after wait: hit!
      }),
      acquireLock: jest.fn().mockRejectedValue(new Error('Lock busy')),
    };
    const cache = new SmartCacheManager(mockRedis as any);
    const result = await cache.getOrFetch({ userId: 'u3', resourceName: 'profile', ttlSeconds: 60, fetcher: async () => 'DB' });
    expect(result).toBe('RETRY_CACHED_DATA');
  });

  it('should throw if wait and retry cache fails', async () => {
    const mockRedis = {
      getCache: jest.fn().mockResolvedValue(null),
      acquireLock: jest.fn().mockRejectedValue(new Error('Lock busy')),
    };
    const cache = new SmartCacheManager(mockRedis as any);
    await expect(cache.getOrFetch({ userId: 'u4', resourceName: 'profile', ttlSeconds: 60, fetcher: async () => 'DB' })).rejects.toThrow('Timeout waiting for cache resolution');
  });

  it('should handle fetcher failure and release lock', async () => {
    const mockRelease = jest.fn().mockResolvedValue(true);
    const mockRedis = {
      getCache: jest.fn().mockResolvedValue(null),
      acquireLock: jest.fn().mockResolvedValue({ release: mockRelease }),
    };
    const cache = new SmartCacheManager(mockRedis as any);
    await expect(cache.getOrFetch({ userId: 'u5', resourceName: 'profile', ttlSeconds: 60, fetcher: async () => { throw new Error('DB Error'); } })).rejects.toThrow('DB Error');
    expect(mockRelease).toHaveBeenCalled();
  });

  it('should handle lock release error gracefully', async () => {
    const mockRelease = jest.fn().mockRejectedValue(new Error('Release Error'));
    const mockRedis = {
      getCache: jest.fn().mockResolvedValue(null),
      acquireLock: jest.fn().mockResolvedValue({ release: mockRelease }),
      setCache: jest.fn().mockResolvedValue(true),
    };
    const cache = new SmartCacheManager(mockRedis as any);
    const result = await cache.getOrFetch({ userId: 'u6', resourceName: 'profile', ttlSeconds: 60, fetcher: async () => 'DB' });
    expect(result).toBe('DB');
    expect(mockRelease).toHaveBeenCalled();
  });
});
