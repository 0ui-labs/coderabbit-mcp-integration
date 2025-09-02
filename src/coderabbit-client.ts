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

  constructor(apiKey: string, apiUrl: string = 'https://api.coderabbit.ai', githubToken?: string) {
    this.apiKey = apiKey;
    this.githubToken = githubToken;
    
    this.api = axios.create({
      baseURL: apiUrl,
      headers: {
        'x-coderabbitai-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 600000 // 10 minutes for report generation
    });

    this.git = simpleGit();
  }

  /**
   * Trigger a CodeRabbit review - NOT AVAILABLE via public API
   * @deprecated Since v2.0.0 - Use GitHub PR workflow instead. Will be removed in v3.0.0
   * @throws {Error} This endpoint is not available in the public API
   * @see {@link GitHubIntegration.createPullRequest} for the recommended approach
   */
  async triggerReview(params: {
    repository: string;
    prNumber?: number;
    branch?: string;
    scope?: 'full' | 'incremental' | 'files';
    files?: string[];
    useLocalChanges?: boolean;
  }): Promise<CodeRabbitReview> {
    console.warn('[DEPRECATED] triggerReview is no longer available. Use GitHub PR workflow instead. This method will be removed in v3.0.0');
    throw new Error('This endpoint is not available in the public API. Please use GitHub Pull Requests to trigger CodeRabbit reviews. See: https://github.com/apps/coderabbitai');
  }

  /**
   * Get review status and results - NOT AVAILABLE via public API
   * @deprecated Since v2.0.0 - Use getCodeRabbitComments from GitHub instead. Will be removed in v3.0.0
   * @throws {Error} This endpoint is not available in the public API
   * @see {@link GitHubIntegration.getCodeRabbitComments} for the recommended approach
   */
  async getReviewStatus(params: {
    reviewId?: string;
    repository?: string;
    prNumber?: number;
  }): Promise<CodeRabbitReview | null> {
    console.warn('[DEPRECATED] getReviewStatus is no longer available. Use GitHub API to get CodeRabbit comments from PRs. This method will be removed in v3.0.0');
    throw new Error('This endpoint is not available in the public API. Use GitHub API to get CodeRabbit comments from PRs.');
  }

  /**
   * Interact with CodeRabbit about a review - NOT AVAILABLE via public API
   * @deprecated Since v2.0.0 - Use askCodeRabbitInPR via GitHub comments instead. Will be removed in v3.0.0
   * @throws {Error} This endpoint is not available in the public API
   * @see {@link GitHubIntegration.askCodeRabbit} for the recommended approach
   */
  async askCodeRabbit(params: {
    reviewId: string;
    question: string;
    context?: 'file' | 'pr' | 'general';
  }): Promise<{ response: string; suggestions?: any[] }> {
    console.warn('[DEPRECATED] askCodeRabbit is no longer available. Use GitHub comments with @coderabbitai to interact. This method will be removed in v3.0.0');
    throw new Error('This endpoint is not available in the public API. Use GitHub comments with @coderabbitai to interact.');
  }

  /**
   * Get review history for a repository - NOT AVAILABLE via public API
   * @deprecated Since v2.0.0 - Use GitHub API to list PR comments instead. Will be removed in v3.0.0
   * @throws {Error} This endpoint is not available in the public API
   * @see {@link GitHubIntegration.getCodeRabbitComments} for the recommended approach
   */
  async getReviewHistory(params: {
    repository: string;
    limit?: number;
    since?: string;
  }): Promise<CodeRabbitReview[]> {
    console.warn('[DEPRECATED] getReviewHistory is no longer available. Use GitHub API to get PR history with CodeRabbit comments. This method will be removed in v3.0.0');
    throw new Error('This endpoint is not available in the public API. Use GitHub API to get PR history with CodeRabbit comments.');
  }

  /**
   * Configure review settings for a repository - NOT AVAILABLE via public API
   * @deprecated Since v2.0.0 - Use .coderabbit.yaml file in repository instead. Will be removed in v3.0.0
   * @throws {Error} This endpoint is not available in the public API
   * @example
   * // Instead, create a .coderabbit.yaml file in your repository root:
   * // reviews:
   * //   auto: true
   * //   level: standard
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
    console.warn('[DEPRECATED] configureReview is no longer available. Configure CodeRabbit via .coderabbit.yaml file in your repository. This method will be removed in v3.0.0');
    throw new Error('This endpoint is not available in the public API. Configure CodeRabbit via .coderabbit.yaml file in your repository.');
  }

  /**
   * Generate a developer activity report (Beta)
   */
  async generateReport(params: {
    from: string;
    to: string;
    prompt?: string;
    groupBy?: string;
    orgId?: string;
  }): Promise<any> {
    try {
      console.log('Generating developer activity report...');
      
      const payload = {
        from: params.from,
        to: params.to,
        prompt: params.prompt,
        groupBy: params.groupBy,
        orgId: params.orgId
      };

      const response = await this.api.post('/v1/report.generate', payload);
      
      return response.data;
    } catch (error) {
      console.error('Error generating report:', error);
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