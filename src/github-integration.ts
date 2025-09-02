import { Octokit } from '@octokit/rest';
import { simpleGit, SimpleGit } from 'simple-git';

// CodeRabbit bot usernames (GitHub Apps can have [bot] suffix)
const CODERABBIT_USERNAMES = ['coderabbitai', 'coderabbitai[bot]'];

// Type definitions for return values
  constructor(githubToken: string) {
    if (!githubToken || githubToken.trim() === '') {
      throw new Error('GitHub token is required and cannot be empty');
    }
    this.octokit = new Octokit({
      auth: githubToken
    });
    this.git = simpleGit();
  }

interface CodeRabbitReview {
  id: number;
  state: string;
  body: string;
  submitted_at: string | null;
  html_url: string;
}

export class GitHubIntegration {
  private octokit: Octokit;
  private git: SimpleGit;

  constructor(githubToken: string) {
    if (!githubToken || githubToken.trim() === '') {
      throw new Error('GitHub token is required and cannot be empty');
    }
    
    this.octokit = new Octokit({
      auth: githubToken
    });
    this.git = simpleGit();
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
      
      // Push to GitHub with set-upstream
      await this.git.push(['--set-upstream', 'origin', params.branch]);
      
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