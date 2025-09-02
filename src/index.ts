#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as dotenv from 'dotenv';
import { CodeRabbitClient } from './coderabbit-client.js';
import { SimpleCache } from './cache.js';
import {
  TriggerReviewSchema,
  GetReviewStatusSchema,
  AskCodeRabbitSchema,
  ConfigureReviewSchema,
  GetReviewHistorySchema,
  CodeRabbitReview
} from './types.js';

// Load environment variables
dotenv.config();

// Validate required environment variables
const CODERABBIT_API_KEY = process.env.CODERABBIT_API_KEY;
const CODERABBIT_API_URL = process.env.CODERABBIT_API_URL || 'https://api.coderabbit.ai/v1';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '300') * 1000; // Convert to milliseconds

if (!CODERABBIT_API_KEY) {
  console.error('Error: CODERABBIT_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize clients
const coderabbitClient = new CodeRabbitClient(CODERABBIT_API_KEY, CODERABBIT_API_URL, GITHUB_TOKEN);
const reviewCache = new SimpleCache<CodeRabbitReview>(CACHE_TTL);

// Create MCP server
const server = new McpServer({
  name: 'coderabbit-mcp',
  version: '1.0.0'
});

// Register MCP Tools

/**
 * Tool: Trigger a CodeRabbit review
 */
server.registerTool(
  'triggerReview',
  {
    title: 'Trigger CodeRabbit Review',
    description: 'Start a CodeRabbit code review for a repository, PR, or local changes',
    inputSchema: TriggerReviewSchema.shape
  },
  async (args) => {
    try {
      const params = TriggerReviewSchema.parse(args);
      
      // Check if we're reviewing local changes
      let reviewDescription = '';
      if (params.useLocalChanges) {
        reviewDescription = `Starting CodeRabbit review for local changes in ${params.repository}`;
      } else if (params.prNumber) {
        reviewDescription = `Starting CodeRabbit review for PR #${params.prNumber} in ${params.repository}`;
      } else if (params.branch) {
        reviewDescription = `Starting CodeRabbit review for branch ${params.branch} in ${params.repository}`;
      } else {
        reviewDescription = `Starting CodeRabbit review for ${params.repository}`;
      }

      console.error(`[triggerReview] ${reviewDescription}`);
      
      const review = await coderabbitClient.triggerReview(params);
      
      // Cache the review
      reviewCache.set(review.id, review);
      if (params.prNumber) {
        reviewCache.set(`pr-${params.repository}-${params.prNumber}`, review);
      }

      // Format response
      let content = `## CodeRabbit Review Started\n\n`;
      content += `**Review ID:** ${review.id}\n`;
      content += `**Repository:** ${review.repository}\n`;
      content += `**Status:** ${review.status}\n`;
      
      if (review.prNumber) {
        content += `**PR Number:** #${review.prNumber}\n`;
      }
      if (review.branch) {
        content += `**Branch:** ${review.branch}\n`;
      }
      if (review.url) {
        content += `**URL:** ${review.url}\n`;
      }
      
      content += `\nReview is now ${review.status}. Use \`getReviewStatus\` to check progress.`;

      return {
        content: [{ type: 'text', text: content }]
      };
    } catch (error: any) {
      console.error('[triggerReview] Error:', error);
      return {
        content: [{ 
          type: 'text', 
          text: `Error triggering review: ${error.message || 'Unknown error'}` 
        }]
      };
    }
  }
);

/**
 * Tool: Get review status and results
 */
server.registerTool(
  'getReviewStatus',
  {
    title: 'Get CodeRabbit Review Status',
    description: 'Get the status and results of a CodeRabbit review',
    inputSchema: GetReviewStatusSchema.shape
  },
  async (args) => {
    try {
      const params = GetReviewStatusSchema.parse(args);
      
      // Try cache first
      let review: CodeRabbitReview | null = null;
      
      if (params.reviewId) {
        review = reviewCache.get(params.reviewId);
      } else if (params.repository && params.prNumber) {
        review = reviewCache.get(`pr-${params.repository}-${params.prNumber}`);
      }
      
      // If not in cache or expired, fetch from API
      if (!review) {
        review = await coderabbitClient.getReviewStatus(params);
        if (review) {
          reviewCache.set(review.id, review);
        }
      }

      if (!review) {
        return {
          content: [{ type: 'text', text: 'No review found with the specified parameters.' }]
        };
      }

      // Format review results
      let content = `## CodeRabbit Review Results\n\n`;
      content += `**Review ID:** ${review.id}\n`;
      content += `**Status:** ${review.status}\n`;
      content += `**Repository:** ${review.repository}\n`;
      
      if (review.summary) {
        content += `\n### Summary\n${review.summary}\n`;
      }

      if (review.stats) {
        content += `\n### Statistics\n`;
        content += `- Files Reviewed: ${review.stats.filesReviewed}\n`;
        content += `- Lines Analyzed: ${review.stats.linesAnalyzed}\n`;
        content += `- Issues Found: ${review.stats.issuesFound}\n`;
        content += `  - Critical: ${review.stats.criticalCount}\n`;
        content += `  - High: ${review.stats.highCount}\n`;
        content += `  - Medium: ${review.stats.mediumCount}\n`;
        content += `  - Low: ${review.stats.lowCount}\n`;
      }

      if (review.issues && review.issues.length > 0) {
        content += `\n### Issues Found\n\n`;
        
        // Group issues by severity
        const criticalIssues = review.issues.filter(i => i.severity === 'critical');
        const highIssues = review.issues.filter(i => i.severity === 'high');
        const mediumIssues = review.issues.filter(i => i.severity === 'medium');
        const lowIssues = review.issues.filter(i => i.severity === 'low');

        const formatIssues = (issues: typeof review.issues, severity: string) => {
          if (issues.length === 0) return '';
          
          let result = `#### ${severity} Issues (${issues.length})\n\n`;
          for (const issue of issues) {
            result += `**[${issue.type}]** ${issue.file}`;
            if (issue.line) result += `:${issue.line}`;
            result += `\n${issue.message}\n`;
            
            if (issue.suggestion) {
              result += `💡 **Suggestion:** ${issue.suggestion}\n`;
            }
            
            if (issue.codeSnippet) {
              result += `\`\`\`\n${issue.codeSnippet}\n\`\`\`\n`;
            }
            
            if (issue.fix) {
              result += `✅ **Proposed Fix:**\n\`\`\`\n${issue.fix}\n\`\`\`\n`;
            }
            
            result += '\n';
          }
          return result;
        };

        content += formatIssues(criticalIssues, 'Critical');
        content += formatIssues(highIssues, 'High');
        content += formatIssues(mediumIssues, 'Medium');
        content += formatIssues(lowIssues, 'Low');
      } else if (review.status === 'completed') {
        content += `\n✅ No issues found! The code looks good.\n`;
      }

      if (review.url) {
        content += `\n**Full Review:** ${review.url}\n`;
      }

      return {
        content: [{ type: 'text', text: content }]
      };
    } catch (error: any) {
      console.error('[getReviewStatus] Error:', error);
      return {
        content: [{ 
          type: 'text', 
          text: `Error getting review status: ${error.message || 'Unknown error'}` 
        }]
      };
    }
  }
);

/**
 * Tool: Ask CodeRabbit a question about a review
 */
server.registerTool(
  'askCodeRabbit',
  {
    title: 'Ask CodeRabbit',
    description: 'Ask CodeRabbit a question about a specific review',
    inputSchema: AskCodeRabbitSchema.shape
  },
  async (args) => {
    try {
      const params = AskCodeRabbitSchema.parse(args);
      
      console.error(`[askCodeRabbit] Asking about review ${params.reviewId}: ${params.question}`);
      
      const response = await coderabbitClient.askCodeRabbit(params);
      
      let content = `## CodeRabbit Response\n\n${response.response}`;
      
      if (response.suggestions && response.suggestions.length > 0) {
        content += `\n\n### Suggestions\n`;
        for (const suggestion of response.suggestions) {
          content += `- ${suggestion}\n`;
        }
      }

      return {
        content: [{ type: 'text', text: content }]
      };
    } catch (error: any) {
      console.error('[askCodeRabbit] Error:', error);
      return {
        content: [{ 
          type: 'text', 
          text: `Error asking CodeRabbit: ${error.message || 'Unknown error'}` 
        }]
      };
    }
  }
);

/**
 * Tool: Configure review settings
 */
server.registerTool(
  'configureReview',
  {
    title: 'Configure CodeRabbit Review',
    description: 'Configure CodeRabbit review settings for a repository',
    inputSchema: ConfigureReviewSchema.shape
  },
  async (args) => {
    try {
      const params = ConfigureReviewSchema.parse(args);
      
      await coderabbitClient.configureReview(params);
      
      let content = `## Review Configuration Updated\n\n`;
      content += `**Repository:** ${params.repository}\n\n`;
      content += `### Settings Applied:\n`;
      
      if (params.settings.autoReview !== undefined) {
        content += `- Auto Review: ${params.settings.autoReview ? 'Enabled' : 'Disabled'}\n`;
      }
      if (params.settings.reviewLevel) {
        content += `- Review Level: ${params.settings.reviewLevel}\n`;
      }
      if (params.settings.customRules && params.settings.customRules.length > 0) {
        content += `- Custom Rules: ${params.settings.customRules.join(', ')}\n`;
      }
      if (params.settings.ignorePatterns && params.settings.ignorePatterns.length > 0) {
        content += `- Ignore Patterns: ${params.settings.ignorePatterns.join(', ')}\n`;
      }

      return {
        content: [{ type: 'text', text: content }]
      };
    } catch (error: any) {
      console.error('[configureReview] Error:', error);
      return {
        content: [{ 
          type: 'text', 
          text: `Error configuring review: ${error.message || 'Unknown error'}` 
        }]
      };
    }
  }
);

/**
 * Tool: Get review history
 */
server.registerTool(
  'getReviewHistory',
  {
    title: 'Get Review History',
    description: 'Get the history of CodeRabbit reviews for a repository',
    inputSchema: GetReviewHistorySchema.shape
  },
  async (args) => {
    try {
      const params = GetReviewHistorySchema.parse(args);
      
      const reviews = await coderabbitClient.getReviewHistory(params);
      
      if (reviews.length === 0) {
        return {
          content: [{ 
            type: 'text', 
            text: `No review history found for ${params.repository}` 
          }]
        };
      }

      let content = `## Review History for ${params.repository}\n\n`;
      content += `Found ${reviews.length} review(s)\n\n`;
      
      for (const review of reviews) {
        content += `### ${review.createdAt.toISOString()}\n`;
        content += `- **ID:** ${review.id}\n`;
        content += `- **Status:** ${review.status}\n`;
        
        if (review.prNumber) {
          content += `- **PR:** #${review.prNumber}\n`;
        }
        if (review.branch) {
          content += `- **Branch:** ${review.branch}\n`;
        }
        if (review.stats) {
          content += `- **Issues:** ${review.stats.issuesFound} `;
          content += `(Critical: ${review.stats.criticalCount}, `;
          content += `High: ${review.stats.highCount}, `;
          content += `Medium: ${review.stats.mediumCount}, `;
          content += `Low: ${review.stats.lowCount})\n`;
        }
        if (review.url) {
          content += `- **URL:** ${review.url}\n`;
        }
        content += '\n';
      }

      return {
        content: [{ type: 'text', text: content }]
      };
    } catch (error: any) {
      console.error('[getReviewHistory] Error:', error);
      return {
        content: [{ 
          type: 'text', 
          text: `Error getting review history: ${error.message || 'Unknown error'}` 
        }]
      };
    }
  }
);

// Clean up cache periodically
setInterval(() => {
  reviewCache.cleanup();
}, 60000); // Every minute

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('CodeRabbit MCP Server is running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});