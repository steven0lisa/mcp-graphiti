import { Graphiti } from '../src/core/graphiti.js';
import { Neo4jDriver } from '../src/drivers/neo4j.js';
import { createLLMClient } from '../src/llm/index.js';
import { createLogger } from '../src/utils/logger.js';
import { BigModelEmbedder } from '../src/embedder/bigmodel.js';
import { GraphitiConfig } from '../src/types/index.js';

// Mock dependencies
jest.mock('../src/drivers/neo4j.js');
jest.mock('../src/llm/index.js');
jest.mock('../src/utils/logger.js');
jest.mock('../src/embedder/bigmodel.js');

describe('Graphiti', () => {
  let graphiti: Graphiti;
  let mockNeo4jDriver: jest.Mocked<Neo4jDriver>;
  let mockLLMClient: any;
  let mockEmbedder: jest.Mocked<BigModelEmbedder>;
  let mockLogger: any;

  const mockConfig: GraphitiConfig = {
    database: {
      uri: 'bolt://localhost:7687',
      user: 'neo4j',
      password: 'testpass',
    },
    llm: {
      provider: 'openai',
      api_key: 'test-key',
      api_url: 'https://api.moonshot.cn/v1',
      model: 'moonshot-v1-8k',
    },
    embedding: {
      api_key: 'test-embedding-key',
      api_url: 'https://test.com/embeddings',
      model: 'test-model',
    },
    embedding_dimension: 1536,
    log_level: 'info',
  };

  beforeEach(() => {
    // Create mock instances
    mockNeo4jDriver = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      addNodes: jest.fn().mockResolvedValue(undefined),
      addEdges: jest.fn().mockResolvedValue(undefined),
      searchNodes: jest.fn().mockResolvedValue([]),
      searchByName: jest.fn().mockResolvedValue([]),
      getFacts: jest.fn().mockResolvedValue([]),
      createIndexes: jest.fn().mockResolvedValue(undefined),
      healthCheck: jest.fn().mockResolvedValue(true),
    } as any;

    mockLLMClient = {
      extractEntities: jest.fn().mockResolvedValue([
        { name: 'John Doe', type: 'person', description: 'Software engineer' },
        { name: 'Microsoft', type: 'company', description: 'Technology company' },
      ]),
      extractRelationships: jest.fn().mockResolvedValue([
        {
          source_entity: 'John Doe',
          target_entity: 'Microsoft',
          relationship_type: 'works_at',
          description: 'John works at Microsoft',
        },
      ]),
      generateSummary: jest.fn().mockResolvedValue('Summary of the text'),
      generateText: jest.fn().mockResolvedValue('OK'),
    };

    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockEmbedder = {
      generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      generateEmbeddings: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
      testConnection: jest.fn().mockResolvedValue(true),
    } as any;

    // Setup mocks
    (Neo4jDriver as jest.MockedClass<typeof Neo4jDriver>).mockImplementation(() => mockNeo4jDriver);
    (createLLMClient as jest.Mock).mockReturnValue(mockLLMClient);
    (createLogger as jest.Mock).mockReturnValue(mockLogger);
    (BigModelEmbedder as jest.MockedClass<typeof BigModelEmbedder>).mockImplementation(() => mockEmbedder);

    graphiti = new Graphiti(mockConfig, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await graphiti.initialize();

      expect(mockNeo4jDriver.connect).toHaveBeenCalledTimes(1);
      expect(mockNeo4jDriver.createIndexes).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith('Graphiti initialized successfully');
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Connection failed');
      mockNeo4jDriver.connect.mockRejectedValueOnce(error);

      await expect(graphiti.initialize()).rejects.toThrow('Connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize Graphiti:', error);
    });
  });

  describe('shutdown', () => {
    it('should shutdown successfully', async () => {
      await graphiti.shutdown();

      expect(mockNeo4jDriver.close).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith('Graphiti shutdown successfully');
    });

    it('should handle shutdown errors', async () => {
      const error = new Error('Shutdown failed');
      mockNeo4jDriver.close.mockRejectedValueOnce(error);

      await expect(graphiti.shutdown()).rejects.toThrow('Shutdown failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Error during Graphiti shutdown:', error);
    });
  });

  describe('addEpisodes', () => {
    const mockEpisodes = [
      {
        name: 'Episode 1',
        content: 'John Doe works at Microsoft as a software engineer.',
        source_description: 'Test episode',
        source: 'test-source',
        reference_time: '2023-01-01T00:00:00Z',
      },
    ];

    it('should process episodes successfully', async () => {
      await graphiti.addEpisodes(mockEpisodes);

      expect(mockLLMClient.extractEntities).toHaveBeenCalledWith(mockEpisodes[0].content);
      expect(mockLLMClient.extractRelationships).toHaveBeenCalledWith(
        mockEpisodes[0].content,
        expect.any(Array)
      );
      expect(mockLLMClient.generateSummary).toHaveBeenCalledWith(
        mockEpisodes[0].content,
        200
      );
      expect(mockNeo4jDriver.addNodes).toHaveBeenCalledTimes(1);
      expect(mockNeo4jDriver.addEdges).toHaveBeenCalledTimes(1);
    });

    it('should handle empty episodes array', async () => {
      await graphiti.addEpisodes([]);

      expect(mockLogger.info).toHaveBeenCalledWith('Processing 0 episodes');
      expect(mockLLMClient.extractEntities).not.toHaveBeenCalled();
      expect(mockNeo4jDriver.addNodes).not.toHaveBeenCalled();
    });

    it('should handle processing errors', async () => {
      const error = new Error('LLM processing failed');
      mockLLMClient.extractEntities.mockRejectedValueOnce(error);

      await expect(graphiti.addEpisodes(mockEpisodes)).rejects.toThrow('LLM processing failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to process episode ${mockEpisodes[0].name}:`,
        error
      );
    });
  });

  describe('search', () => {
    beforeEach(() => {
      mockNeo4jDriver.searchNodes.mockResolvedValue([
        {
          id: 'node-1',
          name: 'John Doe',
          type: 'person',
          summary: 'Software engineer',
          created_at: '2023-01-01T00:00:00Z',
          score: 0.95,
        } as any,
      ]);
    });

    it('should perform keyword search successfully', async () => {
      const query = 'John Doe';
      const numResults = 5;
      const searchType = 'keyword';

      const results = await graphiti.search(query, numResults, searchType);

      expect(mockNeo4jDriver.searchNodes).toHaveBeenCalledWith(query, numResults);
      expect(results).toHaveLength(1);
      expect(results[0].node?.name).toBe('John Doe');
      expect(results[0].score).toBe(0.95);
    });

    it('should perform hybrid search', async () => {
      const query = 'software engineer';
      const numResults = 10;

      const results = await graphiti.search(query, numResults, 'hybrid');

      expect(mockNeo4jDriver.searchNodes).toHaveBeenCalledTimes(2); // Once for each search type
      expect(results).toBeDefined();
    });

    it('should handle search errors gracefully', async () => {
      const error = new Error('Search failed');
      mockNeo4jDriver.searchNodes.mockRejectedValueOnce(error);

      const results = await graphiti.search('test query', 10, 'keyword');

      expect(results).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith('Keyword search failed:', error);
    });

    it('should throw error for unsupported search type', async () => {
      await expect(graphiti.search('test', 10, 'unsupported')).rejects.toThrow(
        'Unsupported search type: unsupported'
      );
    });
  });

  describe('getEntities', () => {
    beforeEach(() => {
      mockNeo4jDriver.searchByName.mockResolvedValue([
        {
          id: 'node-1',
          name: 'John Doe',
          type: 'person',
          summary: 'Software engineer',
          created_at: '2023-01-01T00:00:00Z',
        },
      ]);
    });

    it('should get entities by name', async () => {
      const name = 'John Doe';

      const entities = await graphiti.getEntities(name);

      expect(mockNeo4jDriver.searchByName).toHaveBeenCalledWith(name, undefined);
      expect(entities).toHaveLength(1);
      expect(entities[0].name).toBe('John Doe');
    });

    it('should get entities by name and type', async () => {
      const name = 'John';
      const entityType = 'person';

      const entities = await graphiti.getEntities(name, entityType);

      expect(mockNeo4jDriver.searchByName).toHaveBeenCalledWith(name, entityType);
    });

    it('should handle getEntities errors', async () => {
      const error = new Error('Database error');
      mockNeo4jDriver.searchByName.mockRejectedValueOnce(error);

      await expect(graphiti.getEntities('John')).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get entities:', error);
    });
  });

  describe('getFacts', () => {
    beforeEach(() => {
      mockNeo4jDriver.getFacts.mockResolvedValue([
        {
          id: 'edge-1',
          type: 'works_at',
          name: 'works at',
          summary: 'John works at Microsoft',
          source_id: 'node-1',
          target_id: 'node-2',
          created_at: '2023-01-01T00:00:00Z',
          source_node: { id: 'node-1', name: 'John Doe', type: 'person', created_at: '2023-01-01T00:00:00Z' },
          target_node: { id: 'node-2', name: 'Microsoft', type: 'company', created_at: '2023-01-01T00:00:00Z' },
        } as any,
      ]);
    });

    it('should get facts with all parameters', async () => {
      const sourceNodeName = 'John Doe';
      const targetNodeName = 'Microsoft';
      const factType = 'works_at';

      const facts = await graphiti.getFacts(sourceNodeName, targetNodeName, factType);

      expect(mockNeo4jDriver.getFacts).toHaveBeenCalledWith(sourceNodeName, targetNodeName, factType);
      expect(facts).toHaveLength(1);
      expect(facts[0].name).toBe('works at');
    });

    it('should get facts with partial parameters', async () => {
      await graphiti.getFacts('John Doe');

      expect(mockNeo4jDriver.getFacts).toHaveBeenCalledWith('John Doe', undefined, undefined);
    });

    it('should get facts with no parameters', async () => {
      await graphiti.getFacts();

      expect(mockNeo4jDriver.getFacts).toHaveBeenCalledWith(undefined, undefined, undefined);
    });

    it('should handle getFacts errors', async () => {
      const error = new Error('Database error');
      mockNeo4jDriver.getFacts.mockRejectedValueOnce(error);

      await expect(graphiti.getFacts('John')).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get facts:', error);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all services are working', async () => {
      const health = await graphiti.healthCheck();

      expect(health).toEqual({
        database: true,
        llm: true,
        embedding: true,
      });
      expect(mockNeo4jDriver.healthCheck).toHaveBeenCalledTimes(1);
      expect(mockLLMClient.generateText).toHaveBeenCalledWith('Hello', 'Respond with just "OK"');
    });

    it('should return unhealthy database status when database check fails', async () => {
      mockNeo4jDriver.healthCheck.mockResolvedValueOnce(false);

      const health = await graphiti.healthCheck();

      expect(health.database).toBe(false);
      expect(health.llm).toBe(true);
      expect(health.embedding).toBe(true);
    });

    it('should return unhealthy LLM status when LLM check fails', async () => {
      const error = new Error('LLM error');
      mockLLMClient.generateText.mockRejectedValueOnce(error);

      const health = await graphiti.healthCheck();

      expect(health.database).toBe(true);
      expect(health.llm).toBe(false);
      expect(health.embedding).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith('LLM health check failed:', error);
    });
  });
});