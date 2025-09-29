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
      process.env.MOONSHOT_API_KEY = 'test-key';
      process.env.MOONSHOT_API_URL = 'https://test.moonshot.cn/v1';
      process.env.LLM_PROVIDER = 'moonshot';
      process.env.LOG_LEVEL = 'debug';
      process.env.GRAPHITI_EMBEDDING_DIMENSION = '768';

      const config = loadConfig();

      expect(config.database.uri).toBe('bolt://test:7687');
      expect(config.database.user).toBe('testuser');
      expect(config.database.password).toBe('testpass');
      expect(config.llm.provider).toBe('moonshot');
      expect(config.llm.api_key).toBe('test-key');
      expect(config.llm.api_url).toBe('https://test.moonshot.cn/v1');
      expect(config.log_level).toBe('debug');
      expect(config.embedding_dimension).toBe(768);
    });

    it('should use default values when environment variables are not set', () => {
      process.env.NEO4J_PASSWORD = 'testpass';
      process.env.MOONSHOT_API_KEY = 'test-key';

      const config = loadConfig();

      expect(config.database.uri).toBe('bolt://localhost:7687');
      expect(config.database.user).toBe('neo4j');
      expect(config.llm.provider).toBe('moonshot');
      expect(config.llm.api_url).toBe('https://api.moonshot.cn/v1');
      expect(config.log_level).toBe('info');
      expect(config.embedding_dimension).toBe(1536);
    });

    it('should throw error when MOONSHOT_API_KEY is not provided', () => {
      process.env.NEO4J_PASSWORD = 'testpass';
      // MOONSHOT_API_KEY is not set

      expect(() => loadConfig()).toThrow('MOONSHOT_API_KEY or OPENAI_API_KEY must be provided');
    });

    it('should throw error when NEO4J_PASSWORD is not provided', () => {
      process.env.MOONSHOT_API_KEY = 'test-key';
      process.env.NEO4J_PASSWORD = 'valid_password'; // Set a valid password first

      const config = loadConfig();

      // Now modify the config to have empty password
      config.database.password = '';

      expect(() => validateConfig(config)).toThrow('Database password is required');
    });

    it('should prefer MOONSHOT_API_KEY over OPENAI_API_KEY', () => {
      process.env.NEO4J_PASSWORD = 'testpass';
      process.env.MOONSHOT_API_KEY = 'moonshot-key';
      process.env.OPENAI_API_KEY = 'openai-key';

      const config = loadConfig();

      expect(config.llm.api_key).toBe('moonshot-key');
    });

    it('should use OPENAI_API_KEY when MOONSHOT_API_KEY is not available', () => {
      process.env.NEO4J_PASSWORD = 'testpass';
      process.env.OPENAI_API_KEY = 'openai-key';

      const config = loadConfig();

      expect(config.llm.api_key).toBe('openai-key');
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
          provider: 'moonshot',
          api_key: 'test-key',
          api_url: 'https://api.moonshot.cn/v1',
          model: 'moonshot-v1-8k',
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
          provider: 'moonshot',
          api_key: 'test-key',
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
          provider: 'moonshot',
          api_key: 'test-key',
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
          provider: 'moonshot',
          api_key: 'test-key',
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
          provider: 'moonshot',
          api_key: '',
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
          provider: 'moonshot',
          api_key: 'test-key',
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
          provider: 'moonshot',
          api_key: 'test-key',
        },
        embedding_dimension: -100,
        log_level: 'info',
      };

      expect(() => validateConfig(invalidConfig)).toThrow('Embedding dimension must be positive');
    });
  });
});