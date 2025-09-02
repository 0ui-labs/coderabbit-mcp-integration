import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { SimpleCache } from '../src/cache';

describe('SimpleCache', () => {
  let cache: SimpleCache<string>;

  beforeEach(() => {
    cache = new SimpleCache<string>(1000, 5); // 1 second TTL, max 5 entries
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Basic Operations', () => {
    test('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    test('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    test('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    test('should delete keys', () => {
      cache.set('key1', 'value1');
      cache.delete('key1');
      expect(cache.get('key1')).toBeNull();
    });

    test('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('TTL Management', () => {
    test('should expire entries after TTL', async () => {
      cache.set('key1', 'value1', 100); // 100ms TTL
      expect(cache.get('key1')).toBe('value1');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeNull();
    });

    test('should use default TTL when not specified', async () => {
      cache.set('key1', 'value1'); // Uses 1000ms default
      expect(cache.get('key1')).toBe('value1');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(cache.get('key1')).toBe('value1'); // Still valid
      
      await new Promise(resolve => setTimeout(resolve, 600));
      expect(cache.get('key1')).toBeNull(); // Now expired
    });
  });

  describe('LRU Eviction', () => {
    test('should evict oldest entry when max size reached', () => {
      // Fill cache to max size
      for (let i = 1; i <= 5; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      
      // All entries should exist
      for (let i = 1; i <= 5; i++) {
        expect(cache.get(`key${i}`)).toBe(`value${i}`);
      }
      
      // Add one more - should evict key1
      cache.set('key6', 'value6');
      expect(cache.get('key1')).toBeNull(); // Evicted
      expect(cache.get('key6')).toBe('value6'); // New entry exists
    });

    test('should maintain max size constraint', () => {
      for (let i = 1; i <= 10; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      
      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(5);
      expect(stats.maxSize).toBe(5);
    });
  });

  describe('Cleanup', () => {
    test('should clean up expired entries', async () => {
      cache.set('key1', 'value1', 100);
      cache.set('key2', 'value2', 200);
      cache.set('key3', 'value3', 1000);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      cache.cleanup();
      
      expect(cache.get('key1')).toBeNull(); // Expired and cleaned
      expect(cache.get('key2')).toBe('value2'); // Still valid
      expect(cache.get('key3')).toBe('value3'); // Still valid
    });
  });

  describe('Statistics', () => {
    test('should provide cache statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(5);
    });
  });
});