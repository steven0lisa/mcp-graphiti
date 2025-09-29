import { config } from 'dotenv';
import { GraphitiConfig, DatabaseConfig, LLMConfig } from '../types/index.js';

// Load environment variables
config();

export function loadConfig(): GraphitiConfig {
  // Database configuration
  const database: DatabaseConfig = {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'neo4j_password',
    database: process.env.NEO4J_DATABASE,
  };

  // LLM configuration
  const llm: LLMConfig = {
    provider: (process.env.LLM_PROVIDER as 'openai' | 'moonshot') || 'moonshot',
    api_key: process.env.MOONSHOT_API_KEY || process.env.OPENAI_API_KEY || '',
    api_url: process.env.MOONSHOT_API_URL || 'https://api.moonshot.cn/v1',
    model: process.env.LLM_MODEL || 'moonshot-v1-8k',
  };

  // Validate required configuration
  if (!llm.api_key) {
    throw new Error('MOONSHOT_API_KEY or OPENAI_API_KEY must be provided');
  }

  return {
    database,
    llm,
    embedding_dimension: parseInt(process.env.GRAPHITI_EMBEDDING_DIMENSION || '1536', 10),
    log_level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
  };
}

export function validateConfig(config: GraphitiConfig): void {
  if (!config.database.uri) {
    throw new Error('Database URI is required');
  }
  if (!config.database.user) {
    throw new Error('Database user is required');
  }
  if (!config.database.password || config.database.password.trim() === '') {
    throw new Error('Database password is required');
  }
  if (!config.llm.api_key) {
    throw new Error('LLM API key is required');
  }
  if (config.embedding_dimension <= 0) {
    throw new Error('Embedding dimension must be positive');
  }
}
