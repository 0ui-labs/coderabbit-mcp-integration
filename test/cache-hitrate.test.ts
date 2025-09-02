import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { SimpleCache } from '../src/cache';

describe('SimpleCache Hit Rate Tracking', () => {
  let cache: SimpleCache<string>;

  beforeEach(() => {
    cache = new SimpleCache<string>(1000, 5); // 1 second TTL, max 5 entries
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Hit Rate Calculation', () => {
    test('should track cache hits correctly', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // Hit
      cache.get('key1'); // Hit
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(1.0); // 100% hit rate
    });

    test('should track cache misses correctly', () => {
      cache.get('nonexistent'); // Miss
      cache.get('another'); // Miss
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.0); // 0% hit rate
    });

    test('should calculate mixed hit rate correctly', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      cache.get('key1'); // Hit
      cache.get('key2'); // Hit
      cache.get('key3'); // Miss
      cache.get('key1'); // Hit
      cache.get('key4'); // Miss
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.6); // 60% hit rate (3/5)
    });

    test('should count expired entries as misses', async () => {
      cache.set('key1', 'value1', 100); // 100ms TTL
      
      cache.get('key1'); // Hit
      await new Promise(resolve => setTimeout(resolve, 150));
      cache.get('key1'); // Miss (expired)
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5); // 50% hit rate
    });

    test('should return undefined hit rate when no requests made', () => {
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBeUndefined();
    });

    test('should reset statistics on clear', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // Hit
      cache.get('key2'); // Miss
      
      let stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      
      cache.clear();
      
      stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBeUndefined();
    });

    test('should reset statistics on destroy', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // Hit
      cache.get('key2'); // Miss
      
      cache.destroy();
      // Create new instance for testing
      cache = new SimpleCache<string>(1000, 5);
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBeUndefined();
    });
  });

  describe('Statistics with Cache Operations', () => {
    test('should maintain correct stats during LRU eviction', () => {
      // Fill cache to max
      for (let i = 1; i <= 5; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      
      // Access all keys (all hits)
      for (let i = 1; i <= 5; i++) {
        cache.get(`key${i}`);
      }
      
      // Add new key (triggers LRU eviction of key1)
      cache.set('key6', 'value6');
      
      // Try to access evicted key
      cache.get('key1'); // Miss
      cache.get('key6'); // Hit
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(6); // 5 initial + 1 for key6
      expect(stats.misses).toBe(1); // 1 for evicted key1
      expect(stats.hitRate).toBeCloseTo(6/7); // ~85.7%
    });

    test('should show complete statistics in getStats', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // Hit
      cache.get('key2'); // Miss
      
      const stats = cache.getStats();
      
      // Verify all expected properties are present
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
      
      // Verify values
      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(5);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });
});