import { z } from 'zod';

// Validation patterns for GitHub naming conventions
const githubNameRegex = /^[a-zA-Z0-9_.-]+$/;
const branchNameRegex = /^[a-zA-Z0-9/_.-]+$/;

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
  repository: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, 'Repository must be in format owner/repo').describe('Repository in format owner/repo'),
  prNumber: z.number().positive('PR number must be positive').optional().describe('Pull request number'),
  branch: z.string().regex(branchNameRegex, 'Invalid branch name').optional().describe('Branch name to review'),
  scope: z.enum(['full', 'incremental', 'files']).optional().default('incremental'),
  files: z.array(z.string()).optional().describe('Specific files to review'),
  useLocalChanges: z.boolean().optional().default(false).describe('Review uncommitted local changes')
});

export const GetReviewStatusSchema = z.object({
  reviewId: z.string().optional().describe('Specific review ID'),
  repository: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, 'Repository must be in format owner/repo').optional().describe('Repository name'),
  prNumber: z.number().positive('PR number must be positive').optional().describe('Pull request number')
});

export const AskCodeRabbitSchema = z.object({
  reviewId: z.string().min(1, 'Review ID cannot be empty').describe('Review ID to ask about'),
  question: z.string().min(1, 'Question cannot be empty').describe('Question to ask CodeRabbit'),
  context: z.enum(['file', 'pr', 'general']).optional().default('general')
});

export const ConfigureReviewSchema = z.object({
  repository: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, 'Repository must be in format owner/repo').describe('Repository to configure'),
  settings: z.object({
    autoReview: z.boolean().optional(),
    reviewLevel: z.enum(['light', 'standard', 'thorough']).optional(),
    customRules: z.array(z.string()).optional(),
    ignorePatterns: z.array(z.string()).optional()
  })
});

export const GetReviewHistorySchema = z.object({
  repository: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, 'Repository must be in format owner/repo').describe('Repository to get history for'),
  limit: z.number().positive('Limit must be positive').optional().default(10),
  since: z.string().optional().describe('ISO date string')
});

export const GenerateReportSchema = z.object({
  from: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in format YYYY-MM-DD'),
    z.string().datetime({ message: 'Invalid datetime format' })
  ]).describe('Start date (ISO format, e.g., 2025-01-01 or 2025-01-01T00:00:00Z)'),
  to: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in format YYYY-MM-DD'),
    z.string().datetime({ message: 'Invalid datetime format' })
  ]).describe('End date (ISO format, e.g., 2025-01-31 or 2025-01-31T23:59:59Z)'),
  prompt: z.string().optional().describe('Custom prompt for the report'),
  groupBy: z.string().optional().describe('Group results by field'),
  orgId: z.string().optional().describe('Organization ID')
});

// GitHub Integration Schemas
export const CreatePRSchema = z.object({
  owner: z.string().regex(githubNameRegex, 'Invalid owner/organization name').describe('Repository owner/organization'),
  repo: z.string().regex(githubNameRegex, 'Invalid repository name').describe('Repository name'),
  title: z.string().min(1, 'Title cannot be empty').describe('PR title'),
  head: z.string().regex(branchNameRegex, 'Invalid branch name').describe('Head branch (source)'),
  base: z.string().regex(branchNameRegex, 'Invalid branch name').optional().default('main').describe('Base branch (target)'),
  body: z.string().optional().describe('PR description')
});

export const GetCodeRabbitCommentsSchema = z.object({
  owner: z.string().regex(githubNameRegex, 'Invalid owner/organization name').describe('Repository owner/organization'),
  repo: z.string().regex(githubNameRegex, 'Invalid repository name').describe('Repository name'),
  prNumber: z.number().positive('PR number must be positive').describe('Pull request number')
});

export const AskCodeRabbitInPRSchema = z.object({
  owner: z.string().regex(githubNameRegex, 'Invalid owner/organization name').describe('Repository owner/organization'),
  repo: z.string().regex(githubNameRegex, 'Invalid repository name').describe('Repository name'),
  prNumber: z.number().positive('PR number must be positive').describe('Pull request number'),
  question: z.string().min(1, 'Question cannot be empty').describe('Question to ask CodeRabbit')
});

// Cache Entry Type
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}