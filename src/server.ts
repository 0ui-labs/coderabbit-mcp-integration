import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as dotenv from 'dotenv';
import { CodeRabbitClient } from './coderabbit-client.js';
import { GitHubIntegration } from './github-integration.js';
import {
  GenerateReportSchema,
  CreatePRSchema,
  GetCodeRabbitCommentsSchema,
  AskCodeRabbitInPRSchema
} from './types.js';

// Load environment variables
dotenv.config();

/**
 * Start the CodeRabbit MCP Server
 */
export async function startServer() {
  // Validate required environment variables
  const CODERABBIT_API_KEY = process.env.CODERABBIT_API_KEY;
  const CODERABBIT_API_URL = process.env.CODERABBIT_API_URL || 'https://api.coderabbit.ai/api';
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  if (!CODERABBIT_API_KEY) {
    console.error('Error: CODERABBIT_API_KEY environment variable is required');
    process.exit(1);
  }

  // Initialize clients
  const coderabbitClient = new CodeRabbitClient(CODERABBIT_API_KEY, CODERABBIT_API_URL, GITHUB_TOKEN);
  const githubIntegration = GITHUB_TOKEN ? new GitHubIntegration(GITHUB_TOKEN) : null;

  // Create MCP server
  const server = new McpServer({
    name: 'coderabbit-mcp',
    version: '2.0.0'
  });

  // Register REAL MCP Tools only

  /**
   * Tool: Generate developer activity report (REAL API)
   */
  server.registerTool(
    'generateReport',
    {
      title: 'Generate Developer Activity Report',
      description: 'Generate a developer activity report (Beta) - May take up to 10 minutes',
      inputSchema: GenerateReportSchema.shape
    },
    async (args) => {
      try {
        const params = GenerateReportSchema.parse(args);
        console.error(`[generateReport] Generating report from ${params.from} to ${params.to}`);
        
        const report = await coderabbitClient.generateReport(params);
        
        let content = `## Developer Activity Report\n\n`;
        content += `**Period:** ${params.from} to ${params.to}\n\n`;
        
        if (typeof report === 'string') {
          content += report;
        } else {
          content += '```json\n' + JSON.stringify(report, null, 2) + '\n```';
        }

        return {
          content: [{ type: 'text', text: content }]
        };
      } catch (error: any) {
        console.error('[generateReport] Error:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error generating report: ${error.message || 'Unknown error'}` 
          }]
        };
      }
    }
  );

  /**
   * GitHub Integration Tools (REAL - via GitHub API)
   */
  if (githubIntegration) {
    console.error('GitHub integration enabled - registering GitHub tools');
    
    /**
     * Tool: Create GitHub PR for CodeRabbit review
     */
    server.registerTool(
      'createPRForReview',
      {
        title: 'Create GitHub PR for Review',
        description: 'Create a GitHub pull request to trigger automatic CodeRabbit review',
        inputSchema: CreatePRSchema.shape
      },
      async (args: any) => {
        try {
          const params = CreatePRSchema.parse(args);
          const pr = await githubIntegration.createPullRequest({
            owner: params.owner,
            repo: params.repo,
            title: params.title,
            head: params.head,
            base: params.base || 'main',
            body: params.body
          });

          let content = `## Pull Request Created\n\n`;
          content += `**PR Number:** #${pr.number}\n`;
          content += `**URL:** ${pr.url}\n`;
          content += `**Status:** ${pr.state}\n\n`;
          content += `CodeRabbit will automatically review this PR within 1-2 minutes.`;

          return {
            content: [{ type: 'text', text: content }]
          };
        } catch (error: any) {
          return {
            content: [{ 
              type: 'text', 
              text: `Error creating PR: ${error.message}` 
            }]
          };
        }
      }
    );

    /**
     * Tool: Get CodeRabbit comments from GitHub PR
     */
    server.registerTool(
      'getCodeRabbitComments',
      {
        title: 'Get CodeRabbit Comments',
        description: 'Get CodeRabbit review comments from a GitHub pull request',
        inputSchema: GetCodeRabbitCommentsSchema.shape
      },
      async (args: any) => {
        try {
          const params = GetCodeRabbitCommentsSchema.parse(args);
          const comments = await githubIntegration.getCodeRabbitComments({
            owner: params.owner,
            repo: params.repo,
            prNumber: params.prNumber
          });

          if (comments.length === 0) {
            return {
              content: [{ 
                type: 'text', 
                text: 'No CodeRabbit comments found. The review might still be in progress or CodeRabbit is not installed for this repository.' 
              }]
            };
          }

          let content = `## CodeRabbit Comments (${comments.length})\n\n`;
          
          for (const comment of comments) {
            content += `### ${new Date(comment.created_at).toLocaleString()}\n`;
            content += `${comment.body}\n`;
            content += `[View on GitHub](${comment.html_url})\n\n`;
          }

          return {
            content: [{ type: 'text', text: content }]
          };
        } catch (error: any) {
          return {
            content: [{ 
              type: 'text', 
              text: `Error getting comments: ${error.message}` 
            }]
          };
        }
      }
    );

    /**
     * Tool: Ask CodeRabbit via GitHub comment
     */
    server.registerTool(
      'askCodeRabbitInPR',
      {
        title: 'Ask CodeRabbit in PR',
        description: 'Ask CodeRabbit a question by posting a comment in a GitHub PR',
        inputSchema: AskCodeRabbitInPRSchema.shape
      },
      async (args: any) => {
        try {
          const params = AskCodeRabbitInPRSchema.parse(args);
          const result = await githubIntegration.askCodeRabbit({
            owner: params.owner,
            repo: params.repo,
            prNumber: params.prNumber,
            question: params.question
          });

          let content = `## Question Posted to CodeRabbit\n\n`;
          content += `**Comment ID:** ${result.commentId}\n`;
          content += `**URL:** ${result.url}\n\n`;
          content += result.message;

          return {
            content: [{ type: 'text', text: content }]
          };
        } catch (error: any) {
          return {
            content: [{ 
              type: 'text', 
              text: `Error posting question: ${error.message}` 
            }]
          };
        }
      }
    );
  } else {
    console.error('GitHub integration disabled - set GITHUB_TOKEN to enable');
  }

  // Connect to transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('CodeRabbit MCP Server v2.0 is running (REAL features only)...');
  console.error(`Available tools: ${githubIntegration ? '4' : '1'} tools registered`);
  
  return server;
}