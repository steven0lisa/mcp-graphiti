import { loadConfig, validateConfig } from '../src/utils/config.js';
import { GraphitiConfig } from '../src/types/index.js';

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load configuration from environment variables', () => {
      process.env.NEO4J_URI = 'bolt://test:7687';
      process.env.NEO4J_USER = 'testuser';
      process.env.NEO4J_PASSWORD = 'testpass';
      process.env.EMBEDDING_API_KEY = 'test-key';
      process.env.EMBEDDING_API_URL = 'https://test.moonshot.cn/v1';
      process.env.EMBEDDING_MODEL = 'moonshot-v1-8k';
      process.env.LLM_MODEL = 'moonshot-v1-8k'; // 添加LLM_MODEL环境变量
      process.env.LOG_LEVEL = 'debug';
      process.env.GRAPHITI_EMBEDDING_DIMENSION = '768';

      const config = loadConfig();

      expect(config.database.uri).toBe('bolt://test:7687');
      expect(config.database.user).toBe('testuser');
      expect(config.database.password).toBe('testpass');
      expect(config.llm.provider).toBe('openai');
      expect(config.llm.api_key).toBe('test-key');
      expect(config.llm.api_url).toBe('https://test.moonshot.cn/v1');
      expect(config.llm.model).toBe('moonshot-v1-8k');
      expect(config.embedding.api_key).toBe('test-key');
      expect(config.embedding.api_url).toBe('https://test.moonshot.cn/v1');
      expect(config.embedding.model).toBe('moonshot-v1-8k');
      expect(config.log_level).toBe('debug');
      expect(config.embedding_dimension).toBe(768);
    });

    it('should use default values when environment variables are not set', () => {
      process.env.NEO4J_PASSWORD = 'testpass';
      process.env.EMBEDDING_API_KEY = 'test-embedding-key';

      const config = loadConfig();

      expect(config.database.uri).toBe('bolt://localhost:7687');
      expect(config.database.user).toBe('neo4j');
      expect(config.llm.provider).toBe('openai');
      expect(config.llm.api_url).toBe('https://open.bigmodel.cn/api/paas/v4');
      expect(config.log_level).toBe('info');
      expect(config.embedding_dimension).toBe(1536);
    });

    it('should throw error when EMBEDDING_API_KEY is not provided', () => {
      process.env.NEO4J_PASSWORD = 'testpass';
      // EMBEDDING_API_KEY is not set

      expect(() => loadConfig()).toThrow('EMBEDDING_API_KEY must be provided');
    });

    it('should throw error when NEO4J_PASSWORD is not provided', () => {
      process.env.EMBEDDING_API_KEY = 'test-embedding-key';
      process.env.NEO4J_PASSWORD = 'valid_password'; // Set a valid password first

      const config = loadConfig();

      // Now modify the config to have empty password
      config.database.password = '';

      expect(() => validateConfig(config)).toThrow('Database password is required');
    });

    it('should use EMBEDDING_API_KEY correctly', () => {
      process.env.NEO4J_PASSWORD = 'testpass';
      process.env.EMBEDDING_API_KEY = 'unified-key';
      process.env.EMBEDDING_API_URL = 'https://api.moonshot.cn/v1';
      process.env.EMBEDDING_MODEL = 'moonshot-v1-8k';
      process.env.LLM_MODEL = 'moonshot-v1-8k'; // 添加LLM_MODEL环境变量

      const config = loadConfig();

      expect(config.llm.api_key).toBe('unified-key');
      expect(config.llm.api_url).toBe('https://api.moonshot.cn/v1');
      expect(config.llm.model).toBe('moonshot-v1-8k');
      expect(config.embedding.api_key).toBe('unified-key');
      expect(config.embedding.api_url).toBe('https://api.moonshot.cn/v1');
      expect(config.embedding.model).toBe('moonshot-v1-8k');
    });
  });

  describe('validateConfig', () => {
    it('should validate a correct configuration', () => {
      const validConfig: GraphitiConfig = {
        database: {
          uri: 'bolt://test:7687',
          user: 'testuser',
          password: 'testpass',
        },
        llm: {
          provider: 'openai',
          api_key: 'test-key',
          api_url: 'https://api.openai.com/v1',
          model: 'gpt-3.5-turbo',
        },
        embedding: {
          api_key: 'test-embedding-key',
          api_url: 'https://test.com/embeddings',
          model: 'test-model',
        },
        embedding_dimension: 1536,
        log_level: 'info',
      };

      expect(() => validateConfig(validConfig)).not.toThrow();
    });

    it('should throw error when database URI is missing', () => {
      const invalidConfig: GraphitiConfig = {
        database: {
          uri: '',
          user: 'testuser',
          password: 'testpass',
        },
        llm: {
          provider: 'openai',
          api_key: 'test-key',
        },
        embedding: {
          api_key: 'test-embedding-key',
          api_url: 'https://test.com/embeddings',
          model: 'test-model',
        },
        embedding_dimension: 1536,
        log_level: 'info',
      };

      expect(() => validateConfig(invalidConfig)).toThrow('Database URI is required');
    });

    it('should throw error when database user is missing', () => {
      const invalidConfig: GraphitiConfig = {
        database: {
          uri: 'bolt://test:7687',
          user: '',
          password: 'testpass',
        },
        llm: {
          provider: 'openai',
          api_key: 'test-key',
        },
        embedding: {
          api_key: 'test-embedding-key',
          api_url: 'https://test.com/embeddings',
          model: 'test-model',
        },
        embedding_dimension: 1536,
        log_level: 'info',
      };

      expect(() => validateConfig(invalidConfig)).toThrow('Database user is required');
    });

    it('should throw error when database password is missing', () => {
      const invalidConfig: GraphitiConfig = {
        database: {
          uri: 'bolt://test:7687',
          user: 'testuser',
          password: '',
        },
        llm: {
          provider: 'openai',
          api_key: 'test-key',
        },
        embedding: {
          api_key: 'test-embedding-key',
          api_url: 'https://test.com/embeddings',
          model: 'test-model',
        },
        embedding_dimension: 1536,
        log_level: 'info',
      };

      expect(() => validateConfig(invalidConfig)).toThrow('Database password is required');
    });

    it('should throw error when LLM API key is missing', () => {
      const invalidConfig: GraphitiConfig = {
        database: {
          uri: 'bolt://test:7687',
          user: 'testuser',
          password: 'testpass',
        },
        llm: {
          provider: 'openai',
          api_key: '',
        },
        embedding: {
          api_key: 'test-embedding-key',
          api_url: 'https://test.com/embeddings',
          model: 'test-model',
        },
        embedding_dimension: 1536,
        log_level: 'info',
      };

      expect(() => validateConfig(invalidConfig)).toThrow('LLM API key is required');
    });

    it('should throw error when embedding dimension is not positive', () => {
      const invalidConfig: GraphitiConfig = {
        database: {
          uri: 'bolt://test:7687',
          user: 'testuser',
          password: 'testpass',
        },
        llm: {
          provider: 'openai',
          api_key: 'test-key',
        },
        embedding: {
          api_key: 'test-embedding-key',
          api_url: 'https://test.com/embeddings',
          model: 'test-model',
        },
        embedding_dimension: 0,
        log_level: 'info',
      };

      expect(() => validateConfig(invalidConfig)).toThrow('Embedding dimension must be positive');
    });

    it('should throw error when embedding dimension is negative', () => {
      const invalidConfig: GraphitiConfig = {
        database: {
          uri: 'bolt://test:7687',
          user: 'testuser',
          password: 'testpass',
        },
        llm: {
          provider: 'openai',
          api_key: 'test-key',
        },
        embedding: {
          api_key: 'test-embedding-key',
          api_url: 'https://test.com/embeddings',
          model: 'test-model',
        },
        embedding_dimension: -100,
        log_level: 'info',
      };

      expect(() => validateConfig(invalidConfig)).toThrow('Embedding dimension must be positive');
    });
  });
});