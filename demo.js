#!/usr/bin/env node

// Simple demo script to test the Graphiti MCP Server functionality

import { config } from 'dotenv';
import { Graphiti } from './dist/core/graphiti.js';
import { createLogger } from './dist/utils/logger.js';
import { loadConfig } from './dist/utils/config.js';

// Load environment variables
config();

async function demo() {
  console.log('🚀 Graphiti MCP Server Demo');
  console.log('============================');

  try {
    // Load configuration
    console.log('1. Loading configuration...');
    const appConfig = loadConfig();
    console.log('✅ Configuration loaded');

    // Create logger
    console.log('2. Creating logger...');
    const logger = createLogger(appConfig.log_level);
    console.log('✅ Logger created');

    // Initialize Graphiti
    console.log('3. Initializing Graphiti...');
    const graphiti = new Graphiti(appConfig, logger);
    await graphiti.initialize();
    console.log('✅ Graphiti initialized');

    // Health check
    console.log('4. Running health check...');
    const health = await graphiti.healthCheck();
    console.log('Health Status:');
    console.log(`  - Database: ${health.database ? '✅' : '❌'}`);
    console.log(`  - LLM: ${health.llm ? '✅' : '❌'}`);

    // Add a sample episode
    console.log('5. Adding sample episode...');
    const episodes = [
      {
        name: 'Demo Episode',
        content: 'John Doe is a software engineer who works at Microsoft. He specializes in AI and machine learning.',
        source_description: 'Demo content for testing',
        reference_time: new Date().toISOString(),
      },
    ];

    await graphiti.addEpisodes(episodes);
    console.log('✅ Sample episode added');

    // Search
    console.log('6. Searching for "John"...');
    const searchResults = await graphiti.search('John', 5, 'keyword');
    console.log(`Found ${searchResults.length} results:`);
    searchResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.content} (Score: ${result.score.toFixed(2)})`);
    });

    // Get entities
    console.log('7. Getting entities named "John"...');
    const entities = await graphiti.getEntities('John');
    console.log(`Found ${entities.length} entities:`);
    entities.forEach((entity, index) => {
      console.log(`  ${index + 1}. ${entity.name} (${entity.type}) - ${entity.summary}`);
    });

    // Get facts
    console.log('8. Getting facts...');
    const facts = await graphiti.getFacts('John', 'Microsoft');
    console.log(`Found ${facts.length} facts:`);
    facts.forEach((fact, index) => {
      console.log(`  ${index + 1}. ${fact.source_node?.name || 'Unknown'} --${fact.name}--> ${fact.target_node?.name || 'Unknown'}`);
    });

    // Shutdown
    console.log('9. Shutting down...');
    await graphiti.shutdown();
    console.log('✅ Graphiti shutdown complete');

    console.log('\n🎉 Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run demo only if required environment variables are set
if (process.env.OPENAI_API_KEY && process.env.NEO4J_PASSWORD) {
  demo().catch((error) => {
    console.error('Demo execution failed:', error);
    process.exit(1);
  });
} else {
  console.log('⚠️  Demo skipped: Missing required environment variables');
  console.log('Please set OPENAI_API_KEY and NEO4J_PASSWORD environment variables');
  console.log('You can copy .env.example to .env and fill in your credentials');
}