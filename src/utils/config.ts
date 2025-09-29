import { config } from 'dotenv';
import { GraphitiConfig, DatabaseConfig, LLMConfig, EmbeddingConfig } from '../types/index.js';

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

  // LLM configuration (使用embedding配置，因为都需要OpenAI兼容API)
  const llm: LLMConfig = {
    provider: 'openai',
    api_key: process.env.EMBEDDING_API_KEY || '',
    api_url: (process.env.EMBEDDING_API_URL || 'https://open.bigmodel.cn/api/paas/v4/embeddings').replace('/embeddings', ''),
    model: process.env.LLM_MODEL || 'glm-4-flash',
  };

  // Embedding configuration (智谱AI)
  const embedding: EmbeddingConfig = {
    api_key: process.env.EMBEDDING_API_KEY || '',
    api_url: process.env.EMBEDDING_API_URL || 'https://open.bigmodel.cn/api/paas/v4/embeddings',
    model: process.env.EMBEDDING_MODEL || 'embedding-3',
  };

  // Validate required configuration
  if (!embedding.api_key) {
    throw new Error('EMBEDDING_API_KEY must be provided');
  }

  if (!embedding.api_key) {
    throw new Error('EMBEDDING_API_KEY must be provided');
  }

  return {
    database,
    llm,
    embedding,
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
  if (!config.embedding.api_key) {
    throw new Error('Embedding API key is required');
  }
  if (config.embedding_dimension <= 0) {
    throw new Error('Embedding dimension must be positive');
  }
}
