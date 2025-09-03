import { describe, test, expect } from '@jest/globals';
import { 
  GetCodeRabbitCommentsSchema,
  GenerateReportSchema,
  CacheEntry
} from '../src/types';

describe('Type Schemas', () => {
  describe('GetCodeRabbitCommentsSchema', () => {
    test('should validate correct GitHub parameters', () => {
      const validParams = {
        owner: 'octocat',
        repo: 'hello-world',
        prNumber: 123
      };

      const result = GetCodeRabbitCommentsSchema.safeParse(validParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validParams);
      }
    });

    test('should reject invalid owner names', () => {
      const invalidParams = {
        owner: 'invalid owner!', // Contains space and special char
        repo: 'hello-world',
        prNumber: 123
      };

      const result = GetCodeRabbitCommentsSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });

    test('should reject invalid repo names', () => {
      const invalidParams = {
        owner: 'octocat',
        repo: 'invalid/repo', // Contains slash
        prNumber: 123
      };

      const result = GetCodeRabbitCommentsSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });

    test('should reject negative PR numbers', () => {
      const invalidParams = {
        owner: 'octocat',
        repo: 'hello-world',
        prNumber: -1
      };

      const result = GetCodeRabbitCommentsSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });

    test('should reject zero PR number', () => {
      const invalidParams = {
        owner: 'octocat',
        repo: 'hello-world',
        prNumber: 0
      };

      const result = GetCodeRabbitCommentsSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });
  });

  describe('GenerateReportSchema', () => {
    test('should validate correct report parameters', () => {
      const validParams = {
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-31T23:59:59Z'
      };

      const result = GenerateReportSchema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    test('should accept optional parameters', () => {
      const validParams = {
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-31T23:59:59Z',
        orgId: 'org-123',
        groupBy: 'author',
        prompt: 'Generate detailed report'
      };

      const result = GenerateReportSchema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    test('should reject invalid date format', () => {
      const invalidParams = {
        from: '2024-01-01', // Missing time component
        to: '2024-01-31T23:59:59Z'
      };

      const result = GenerateReportSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });

    test('should reject missing required fields', () => {
      const invalidParams = {
        from: '2024-01-01T00:00:00Z'
        // Missing 'to' field
      };

      const result = GenerateReportSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });
  });

  describe('CacheEntry Type', () => {
    test('should have correct structure', () => {
      const entry: CacheEntry<string> = {
        data: 'test data',
        timestamp: Date.now(),
        ttl: 300000
      };

      expect(entry.data).toBe('test data');
      expect(typeof entry.timestamp).toBe('number');
      expect(entry.ttl).toBe(300000);
    });
  });
});