#!/usr/bin/env node

import { GraphitiMcpServer } from './mcp-server.js';

async function main(): Promise<void> {
  try {
    const server = new GraphitiMcpServer();
    await server.run();
  } catch (error) {
    console.error('Failed to start Graphiti MCP server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Server startup failed:', error);
    process.exit(1);
  });
}

export { GraphitiMcpServer } from './mcp-server.js';
export { Graphiti } from './core/graphiti.js';
export * from './types/index.js';