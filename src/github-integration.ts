import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';
import { simpleGit, SimpleGit } from 'simple-git';

// Create Octokit with throttling plugin
const MyOctokit = Octokit.plugin(throttling);

// CodeRabbit bot usernames (GitHub Apps can have [bot] suffix)
const CODERABBIT_USERNAMES = ['coderabbitai', 'coderabbitai[bot]'];

// Type definitions for return values
interface CodeRabbitComment {
  id: number;
  body: string;
  created_at: string;
  html_url: string;
}

interface CodeRabbitReview {
  id: number;
  state: string;
  body: string;
  submitted_at: string | null;
  html_url: string;
}

export class GitHubIntegration {
  private octokit: InstanceType<typeof MyOctokit>;
  private git: SimpleGit;
  private rateLimiter = {
    requests: 0,
    resetTime: Date.now() + 3600000, // 1 hour from now
    remaining: 5000,
    limit: 5000
  };

  constructor(githubToken: string) {
    if (!githubToken || githubToken.trim() === '') {
      throw new Error('GitHub token is required and cannot be empty');
    }
    
    this.octokit = new MyOctokit({
      auth: githubToken,
      throttle: {
        onRateLimit: (retryAfter: number, options: any) => {
          console.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
          console.warn(`Retrying after ${retryAfter} seconds!`);
          return true;
        },
        onSecondaryRateLimit: (retryAfter: number, options: any) => {
          console.warn(`Secondary rate limit hit for ${options.method} ${options.url}`);
          console.warn(`Retrying after ${retryAfter} seconds!`);
          return true;
        }
      }
    });
    this.git = simpleGit();
  }

  /**
   * Check and update rate limit status
   */
  private async checkRateLimit(): Promise<void> {
    try {
      const { data } = await this.octokit.rest.rateLimit.get();
      // Use core resource which contains the standard API rate limits
      // Fallback to data.rate for older API responses
      const core = data.resources?.core ?? data.rate;
      
      this.rateLimiter.remaining = core.remaining;
      this.rateLimiter.limit = core.limit;
      this.rateLimiter.resetTime = core.reset * 1000; // Convert to milliseconds
      
      if (this.rateLimiter.remaining < 100) {
        console.warn(`⚠️ GitHub API rate limit low: ${this.rateLimiter.remaining}/${this.rateLimiter.limit} remaining`);
      }
      
      if (this.rateLimiter.remaining === 0) {
        // Ensure waitTime is never negative
        const waitTime = Math.max(0, this.rateLimiter.resetTime - Date.now());
        throw new Error(`GitHub API rate limit exceeded. Resets in ${Math.ceil(waitTime / 60000)} minutes`);
      }
    } catch (error) {
      // If we can't check rate limit, continue but log warning
      console.warn('Could not check GitHub rate limit:', error);
    }
  }

  /**
   * Create a pull request to trigger CodeRabbit review
   */
  async createPullRequest(params: {
    owner: string;
    repo: string;
    title: string;
    head: string;
    base: string;
    body?: string;
  }) {
    try {
      await this.checkRateLimit();
      
      const pr = await this.octokit.pulls.create({
        owner: params.owner,
        repo: params.repo,
        title: params.title,
        head: params.head,
        base: params.base,
        body: params.body || 'PR created for CodeRabbit review'
      });

      return {
        number: pr.data.number,
        url: pr.data.html_url,
        state: pr.data.state
      };
    } catch (error) {
      console.error('Error creating PR:', error);
      throw error;
    }
  }

  /**
   * Get CodeRabbit comments from a PR
   */
  async getCodeRabbitComments(params: {
    owner: string;
    repo: string;
    prNumber: number;
  }): Promise<CodeRabbitComment[]> {
    try {
      await this.checkRateLimit();
      
      const comments = await this.octokit.issues.listComments({
        owner: params.owner,
        repo: params.repo,
        issue_number: params.prNumber
      });

      // Filter for CodeRabbit comments (including bot variant)
      const coderabbitComments = comments.data.filter(comment => {
        if (!comment.user?.login) return false;
        const username = comment.user.login.toLowerCase();
        return CODERABBIT_USERNAMES.includes(username);
      });

      return coderabbitComments.map(comment => ({
        id: comment.id,
        body: comment.body || '',
        created_at: comment.created_at,
        html_url: comment.html_url || ''
      }));
    } catch (error) {
      console.error('Error getting comments:', error);
      throw error;
    }
  }

  /**
   * Get PR review comments from CodeRabbit
   */
  async getCodeRabbitReviews(params: {
    owner: string;
    repo: string;
    prNumber: number;
  }): Promise<CodeRabbitReview[]> {
    try {
      await this.checkRateLimit();
      
      const reviews = await this.octokit.pulls.listReviews({
        owner: params.owner,
        repo: params.repo,
        pull_number: params.prNumber
      });

      // Filter for CodeRabbit reviews (including bot variant)
      const coderabbitReviews = reviews.data.filter(review => {
        if (!review.user?.login) return false;
        const username = review.user.login.toLowerCase();
        return CODERABBIT_USERNAMES.includes(username);
      });

      return coderabbitReviews.map(review => ({
        id: review.id,
        state: review.state || 'PENDING',
        body: review.body || '',
        submitted_at: review.submitted_at || null,
        html_url: review.html_url || ''
      }));
    } catch (error) {
      console.error('Error getting reviews:', error);
      throw error;
    }
  }

  /**
   * Interact with CodeRabbit via PR comments
   */
  async askCodeRabbit(params: {
    owner: string;
    repo: string;
    prNumber: number;
    question: string;
  }) {
    try {
      await this.checkRateLimit();
      
      // Post a comment mentioning @coderabbitai
      const comment = await this.octokit.issues.createComment({
        owner: params.owner,
        repo: params.repo,
        issue_number: params.prNumber,
        body: `@coderabbitai ${params.question}`
      });

      return {
        commentId: comment.data.id,
        url: comment.data.html_url,
        message: 'Question posted. CodeRabbit will respond in the PR.'
      };
    } catch (error) {
      console.error('Error posting comment:', error);
      throw error;
    }
  }

  /**
   * Push local changes and create PR for review
   * Safely handles Git operations with proper validation and rollback
   */
  async pushChangesAndCreatePR(params: {
    owner: string;
    repo: string;
    branch: string;
    title: string;
    description?: string;
    files?: string[]; // Optional: specific files to add
  }) {
    // Store original branch for rollback
    const originalBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
    
    try {
      // Check for uncommitted changes
      const status = await this.git.status();
      if (!status.isClean()) {
        throw new Error('Repository has uncommitted changes. Please commit or stash them first.');
      }
      
      // Check if branch already exists locally
      const branches = await this.git.branchLocal();
      if (branches.all.includes(params.branch)) {
        throw new Error(`Branch ${params.branch} already exists locally. Please use a different branch name.`);
      }
      
      // Create and checkout new branch
      await this.git.checkoutLocalBranch(params.branch);
      
      // Add changes safely
      if (params.files && params.files.length > 0) {
        // Add only specified files
        await this.git.add(params.files);
      } else {
        // Add only tracked files that have been modified
        await this.git.add(['-u']); // Only add updated tracked files
        // For new files, require explicit file list
        const newStatus = await this.git.status();
        if (newStatus.not_added.length > 0) {
          console.warn('New untracked files detected but not added. Specify files explicitly in params.files if needed.');
        }
      }
      
      // Commit changes
      await this.git.commit(`feat: ${params.title}`);
      
      // Push to GitHub with set-upstream (with force-push protection)
      await this.git.push(['--set-upstream', 'origin', params.branch, '--no-force']);
      
      // Create PR
      const pr = await this.createPullRequest({
        owner: params.owner,
        repo: params.repo,
        title: params.title,
        head: params.branch,
        base: 'main',
        body: params.description
      });

      return pr;
    } catch (error) {
      // Attempt to restore original branch on error
      try {
        await this.git.checkout(originalBranch);
        // Try to delete the created branch if it exists
        try {
          await this.git.deleteLocalBranch(params.branch, true);
        } catch {
          // Branch might not have been created, ignore
        }
      } catch (rollbackError) {
        console.error('Failed to restore original branch:', rollbackError);
      }
      
      console.error('Error in push and create PR:', error);
      throw error;
    }
  }
}