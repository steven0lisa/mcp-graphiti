#!/usr/bin/env node

import { createServer } from './mcp-server.js';

async function main(): Promise<void> {
  try {
    const server = createServer();
    await server.run();
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});