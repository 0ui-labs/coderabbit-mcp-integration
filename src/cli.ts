#!/usr/bin/env node

/**
 * CLI entry point for CodeRabbit MCP Server
 * This file handles the server startup when used as a command-line tool
 */

import { startServer } from './server.js';

// Start the MCP server
startServer().catch((error) => {
  console.error('Failed to start CodeRabbit MCP Server:', error);
  process.exit(1);
});