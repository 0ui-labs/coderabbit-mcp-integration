import axios, { AxiosInstance } from 'axios';
import { CodeRabbitReview, CodeRabbitIssue, ReviewStats } from './types.js';
import { simpleGit, SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';

export class CodeRabbitClient {
  private api: AxiosInstance;
  private git: SimpleGit;
  private apiKey: string;
  private githubToken?: string;

  constructor(apiKey: string, apiUrl: string = 'https://api.coderabbit.ai/v1', githubToken?: string) {
    this.apiKey = apiKey;
    this.githubToken = githubToken;
    
    this.api = axios.create({
      baseURL: apiUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    this.git = simpleGit();
  }

  /**
   * Trigger a CodeRabbit review
   */
  async triggerReview(params: {
    repository: string;
    prNumber?: number;
    branch?: string;
    scope?: 'full' | 'incremental' | 'files';
    files?: string[];
    useLocalChanges?: boolean;
  }): Promise<CodeRabbitReview> {
    try {
      // If using local changes, prepare diff
      let diffContent: string | undefined;
      if (params.useLocalChanges) {
        diffContent = await this.getLocalDiff();
      }

      const payload = {
        repository: params.repository,
        pr_number: params.prNumber,
        branch: params.branch || await this.getCurrentBranch(),
        scope: params.scope || 'incremental',
        files: params.files,
        diff: diffContent
      };

      const response = await this.api.post('/reviews', payload);
      
      return this.mapToReview(response.data);
    } catch (error) {
      console.error('Error triggering review:', error);
      throw error;
    }
  }

  /**
   * Get review status and results
   */
  async getReviewStatus(params: {
    reviewId?: string;
    repository?: string;
    prNumber?: number;
  }): Promise<CodeRabbitReview | null> {
    try {
      let endpoint = '/reviews';
      
      if (params.reviewId) {
        endpoint = `/reviews/${params.reviewId}`;
      } else if (params.repository && params.prNumber) {
        endpoint = `/reviews/pr/${params.repository}/${params.prNumber}`;
      } else {
        throw new Error('Either reviewId or repository+prNumber required');
      }

      const response = await this.api.get(endpoint);
      return this.mapToReview(response.data);
    } catch (error) {
      console.error('Error getting review status:', error);
      return null;
    }
  }

  /**
   * Interact with CodeRabbit about a review
   */
  async askCodeRabbit(params: {
    reviewId: string;
    question: string;
    context?: 'file' | 'pr' | 'general';
  }): Promise<{ response: string; suggestions?: any[] }> {
    try {
      const response = await this.api.post(`/reviews/${params.reviewId}/chat`, {
        message: params.question,
        context: params.context || 'general'
      });

      return {
        response: response.data.message,
        suggestions: response.data.suggestions
      };
    } catch (error) {
      console.error('Error asking CodeRabbit:', error);
      throw error;
    }
  }

  /**
   * Get review history for a repository
   */
  async getReviewHistory(params: {
    repository: string;
    limit?: number;
    since?: string;
  }): Promise<CodeRabbitReview[]> {
    try {
      const response = await this.api.get(`/reviews/history/${params.repository}`, {
        params: {
          limit: params.limit || 10,
          since: params.since
        }
      });

      return response.data.reviews.map((r: any) => this.mapToReview(r));
    } catch (error) {
      console.error('Error getting review history:', error);
      return [];
    }
  }

  /**
   * Configure review settings for a repository
   */
  async configureReview(params: {
    repository: string;
    settings: {
      autoReview?: boolean;
      reviewLevel?: 'light' | 'standard' | 'thorough';
      customRules?: string[];
      ignorePatterns?: string[];
    };
  }): Promise<void> {
    try {
      await this.api.put(`/config/${params.repository}`, params.settings);
    } catch (error) {
      console.error('Error configuring review:', error);
      throw error;
    }
  }

  /**
   * Get local git diff for uncommitted changes
   */
  private async getLocalDiff(): Promise<string> {
    try {
      // Get both staged and unstaged changes
      const stagedDiff = await this.git.diff(['--cached']);
      const unstagedDiff = await this.git.diff();
      
      let combinedDiff = '';
      if (stagedDiff) {
        combinedDiff += '=== STAGED CHANGES ===\n' + stagedDiff + '\n';
      }
      if (unstagedDiff) {
        combinedDiff += '=== UNSTAGED CHANGES ===\n' + unstagedDiff + '\n';
      }
      
      if (!combinedDiff) {
        // No uncommitted changes, get diff from last commit
        combinedDiff = await this.git.diff(['HEAD~1', 'HEAD']);
      }
      
      return combinedDiff;
    } catch (error) {
      console.error('Error getting local diff:', error);
      return '';
    }
  }

  /**
   * Get current git branch
   */
  private async getCurrentBranch(): Promise<string> {
    try {
      const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      return branch.trim();
    } catch (error) {
      return 'main';
    }
  }

  /**
   * Map API response to CodeRabbitReview type
   */
  private mapToReview(data: any): CodeRabbitReview {
    return {
      id: data.id || data.review_id,
      repository: data.repository,
      prNumber: data.pr_number,
      branch: data.branch,
      status: data.status,
      summary: data.summary,
      issues: this.mapIssues(data.issues || data.findings || []),
      stats: this.mapStats(data.stats || data.statistics),
      createdAt: new Date(data.created_at || data.started_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      url: data.url || data.review_url
    };
  }

  /**
   * Map API issues to CodeRabbitIssue type
   */
  private mapIssues(issues: any[]): CodeRabbitIssue[] {
    return issues.map(issue => ({
      id: issue.id || `issue-${Date.now()}-${Math.random()}`,
      severity: this.mapSeverity(issue.severity || issue.level),
      type: this.mapIssueType(issue.type || issue.category),
      file: issue.file || issue.path,
      line: issue.line || issue.line_number,
      column: issue.column,
      message: issue.message || issue.description,
      suggestion: issue.suggestion || issue.recommendation,
      codeSnippet: issue.code_snippet || issue.context,
      fix: issue.fix || issue.proposed_fix
    }));
  }

  /**
   * Map severity levels
   */
  private mapSeverity(severity: string): CodeRabbitIssue['severity'] {
    const normalized = severity.toLowerCase();
    if (normalized.includes('critical') || normalized.includes('error')) return 'critical';
    if (normalized.includes('high') || normalized.includes('warning')) return 'high';
    if (normalized.includes('medium')) return 'medium';
    if (normalized.includes('low') || normalized.includes('minor')) return 'low';
    return 'info';
  }

  /**
   * Map issue types
   */
  private mapIssueType(type: string): CodeRabbitIssue['type'] {
    const normalized = type.toLowerCase();
    if (normalized.includes('security')) return 'security';
    if (normalized.includes('performance')) return 'performance';
    if (normalized.includes('bug') || normalized.includes('error')) return 'bug';
    if (normalized.includes('style') || normalized.includes('format')) return 'style';
    if (normalized.includes('smell')) return 'code_smell';
    return 'best_practice';
  }

  /**
   * Map statistics
   */
  private mapStats(stats: any): ReviewStats | undefined {
    if (!stats) return undefined;
    
    return {
      filesReviewed: stats.files_reviewed || stats.files || 0,
      linesAnalyzed: stats.lines_analyzed || stats.lines || 0,
      issuesFound: stats.issues_found || stats.total_issues || 0,
      criticalCount: stats.critical_count || stats.critical || 0,
      highCount: stats.high_count || stats.high || 0,
      mediumCount: stats.medium_count || stats.medium || 0,
      lowCount: stats.low_count || stats.low || 0,
      estimatedReviewTime: stats.estimated_time || stats.review_time
    };
  }
}