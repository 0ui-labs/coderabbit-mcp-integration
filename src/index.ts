/**
 * Library exports for CodeRabbit MCP Server
 * 
 * This is a barrel export module that provides programmatic access to the server components.
 * It contains NO side effects and does NOT start the server automatically.
 * 
 * To start the MCP server:
 * - Use the CLI: `npm start` or `node dist/cli.js`
 * - Or programmatically: import { startServer } from '@coderabbit/mcp-server' and call startServer()
 * 
 * @module @coderabbit/mcp-server
 */

export { CodeRabbitClient } from './coderabbit-client.js';
export { GitHubIntegration } from './github-integration.js';
export { startServer } from './server.js';
export * from './types.js';