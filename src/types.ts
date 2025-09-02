import { z } from 'zod';

// CodeRabbit Review Types
export interface CodeRabbitReview {
  id: string;
  repository: string;
  prNumber?: number;
  branch?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  summary?: string;
  issues: CodeRabbitIssue[];
  stats?: ReviewStats;
  createdAt: Date;
  completedAt?: Date;
  url?: string;
}

export interface CodeRabbitIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: 'bug' | 'security' | 'performance' | 'style' | 'best_practice' | 'code_smell';
  file: string;
  line?: number;
  column?: number;
  message: string;
  suggestion?: string;
  codeSnippet?: string;
  fix?: string;
}

export interface ReviewStats {
  filesReviewed: number;
  linesAnalyzed: number;
  issuesFound: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  estimatedReviewTime?: string;
}

export interface CodeSuggestion {
  file: string;
  line: number;
  original: string;
  suggested: string;
  explanation: string;
}

// Input Schemas for Tools
export const TriggerReviewSchema = z.object({
  repository: z.string().describe('Repository in format owner/repo'),
  prNumber: z.number().optional().describe('Pull request number'),
  branch: z.string().optional().describe('Branch name to review'),
  scope: z.enum(['full', 'incremental', 'files']).optional().default('incremental'),
  files: z.array(z.string()).optional().describe('Specific files to review'),
  useLocalChanges: z.boolean().optional().default(false).describe('Review uncommitted local changes')
});

export const GetReviewStatusSchema = z.object({
  reviewId: z.string().optional().describe('Specific review ID'),
  repository: z.string().optional().describe('Repository name'),
  prNumber: z.number().optional().describe('Pull request number')
});

export const AskCodeRabbitSchema = z.object({
  reviewId: z.string().describe('Review ID to ask about'),
  question: z.string().describe('Question to ask CodeRabbit'),
  context: z.enum(['file', 'pr', 'general']).optional().default('general')
});

export const ConfigureReviewSchema = z.object({
  repository: z.string().describe('Repository to configure'),
  settings: z.object({
    autoReview: z.boolean().optional(),
    reviewLevel: z.enum(['light', 'standard', 'thorough']).optional(),
    customRules: z.array(z.string()).optional(),
    ignorePatterns: z.array(z.string()).optional()
  })
});

export const GetReviewHistorySchema = z.object({
  repository: z.string().describe('Repository to get history for'),
  limit: z.number().optional().default(10),
  since: z.string().optional().describe('ISO date string')
});

// Cache Entry Type
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}