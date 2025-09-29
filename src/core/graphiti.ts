import { v4 as uuidv4 } from 'uuid';
import { formatISO } from 'date-fns';
import { GraphitiConfig, Node, Edge, Episode, SearchResult } from '../types/index.js';
import { Neo4jDriver } from '../drivers/neo4j.js';
import { createLLMClient, LLMClient } from '../llm/index.js';
import { BigModelEmbedder } from '../embedder/index.js';
import { Logger } from '../utils/logger.js';

export class Graphiti {
  private config: GraphitiConfig;
  private database: Neo4jDriver;
  private llm: LLMClient;
  private embedder: BigModelEmbedder;
  private logger: Logger;

  constructor(config: GraphitiConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.database = new Neo4jDriver(config.database, logger);
    this.llm = createLLMClient(config.llm, logger);
    this.embedder = new BigModelEmbedder(config.embedding, logger);
  }

  async initialize(): Promise<void> {
    try {
      await this.database.connect();
      await this.database.createIndexes();
      this.logger.info('Graphiti initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Graphiti:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.database.close();
      this.logger.info('Graphiti shutdown successfully');
    } catch (error) {
      this.logger.error('Error during Graphiti shutdown:', error);
      throw error;
    }
  }

  async addEpisodes(episodes: Episode[]): Promise<void> {
    this.logger.info(`Processing ${episodes.length} episodes`);

    for (const episode of episodes) {
      try {
        await this.processEpisode(episode);
      } catch (error) {
        this.logger.error(`Failed to process episode ${episode.name}:`, error);
        throw error;
      }
    }

    this.logger.info(`Successfully processed ${episodes.length} episodes`);
  }

  private async processEpisode(episode: Episode): Promise<void> {
    this.logger.debug(`Processing episode: ${episode.name}`);

    // Extract entities from the episode content
    const entities = await this.llm.extractEntities(episode.content);
    this.logger.debug(`Extracted ${entities.length} entities from episode ${episode.name}`);

    // Extract relationships between entities
    const relationships = await this.llm.extractRelationships(episode.content, entities);
    this.logger.debug(
      `Extracted ${relationships.length} relationships from episode ${episode.name}`
    );

    // Generate summary for the episode
    const summary = await this.llm.generateSummary(episode.content, 200);

    // Create nodes for entities
    const nodes: Node[] = entities.map((entity: any) => ({
      id: uuidv4(),
      type: entity.type || 'entity',
      name: entity.name,
      summary: entity.description || '',
      created_at: formatISO(new Date()),
      valid_at: episode.reference_time || formatISO(new Date()),
      attributes: {
        source_episode: episode.name,
        source_description: episode.source_description,
        episode_summary: summary,
        ...entity.attributes,
      },
    }));

    // Create edges for relationships
    const edges: Edge[] = relationships.map((rel: any) => ({
      id: uuidv4(),
      type: rel.relationship_type || 'related_to',
      source_id: this.findNodeIdByName(nodes, rel.source_entity),
      target_id: this.findNodeIdByName(nodes, rel.target_entity),
      name: rel.relationship_type || 'related_to',
      summary: rel.description || '',
      created_at: formatISO(new Date()),
      valid_at: episode.reference_time || formatISO(new Date()),
      attributes: {
        source_episode: episode.name,
        confidence: rel.confidence || 0.8,
        ...rel.attributes,
      },
    }));

    // Filter out edges with invalid source/target IDs
    const validEdges = edges.filter(
      (edge) => edge.source_id !== '' && edge.target_id !== '' && edge.source_id !== edge.target_id
    );

    // Add nodes and edges to the database
    if (nodes.length > 0) {
      await this.database.addNodes(nodes);
    }

    if (validEdges.length > 0) {
      await this.database.addEdges(validEdges);
    }

    this.logger.info(
      `Episode ${episode.name}: Added ${nodes.length} nodes and ${validEdges.length} edges`
    );
  }

  private findNodeIdByName(nodes: Node[], name: string): string {
    const node = nodes.find((n) => n.name.toLowerCase() === name.toLowerCase());
    return node ? node.id : '';
  }

  async search(
    query: string,
    numResults: number = 10,
    searchType: string = 'hybrid'
  ): Promise<SearchResult[]> {
    this.logger.debug(`Searching for: ${query} (type: ${searchType}, limit: ${numResults})`);

    let results: SearchResult[] = [];

    switch (searchType) {
      case 'semantic':
        results = await this.semanticSearch(query, numResults);
        break;
      case 'keyword':
        results = await this.keywordSearch(query, numResults);
        break;
      case 'hybrid': {
        const semanticResults = await this.semanticSearch(query, numResults);
        const keywordResults = await this.keywordSearch(query, numResults);
        results = this.combineSearchResults(semanticResults, keywordResults, numResults);
        break;
      }
      default:
        throw new Error(`Unsupported search type: ${searchType}`);
    }

    this.logger.info(`Search completed: found ${results.length} results`);
    return results;
  }

  private async semanticSearch(query: string, numResults: number): Promise<SearchResult[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embedder.generateEmbedding(query);
      
      // Search for similar nodes using vector similarity
      // Note: This requires vector search capability in Neo4j
      const results = await this.database.vectorSearch(queryEmbedding, numResults);
      
      return results.map((result) => ({
        node: result.node,
        score: result.score,
        content: `${result.node.name} (${result.node.type}): ${result.node.summary || 'No description'}`,
      }));
    } catch (error) {
      this.logger.error('Semantic search failed, falling back to keyword search:', error);
      // Fallback to keyword search if embedding fails
      return this.keywordSearch(query, numResults);
    }
  }

  private async keywordSearch(query: string, numResults: number): Promise<SearchResult[]> {
    try {
      // Search nodes
      const nodes = await this.database.searchNodes(query, numResults);

      // Convert nodes to search results
      const results: SearchResult[] = nodes.map((node) => ({
        node: {
          ...node,
          score: undefined, // Remove score from node properties
        },
        score: (node as any).score || 1.0,
        content: `${node.name} (${node.type}): ${node.summary || 'No description'}`,
      }));

      return results;
    } catch (error) {
      this.logger.error('Keyword search failed:', error);
      return [];
    }
  }

  private combineSearchResults(
    semanticResults: SearchResult[],
    keywordResults: SearchResult[],
    maxResults: number
  ): SearchResult[] {
    const combined = new Map<string, SearchResult>();

    // Add semantic results with higher weight
    semanticResults.forEach((result) => {
      const key = result.node?.id || result.edge?.id || '';
      if (key) {
        combined.set(key, { ...result, score: result.score * 1.2 });
      }
    });

    // Add keyword results, combining scores if already exists
    keywordResults.forEach((result) => {
      const key = result.node?.id || result.edge?.id || '';
      if (key) {
        const existing = combined.get(key);
        if (existing) {
          existing.score += result.score * 0.8;
        } else {
          combined.set(key, result);
        }
      }
    });

    // Sort by score and return top results
    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  async getEntities(name: string, entityType?: string): Promise<Node[]> {
    this.logger.debug(`Getting entities: name=${name}, type=${entityType}`);

    try {
      const entities = await this.database.searchByName(name, entityType);
      this.logger.info(`Found ${entities.length} entities matching criteria`);
      return entities;
    } catch (error) {
      this.logger.error('Failed to get entities:', error);
      throw error;
    }
  }

  async getFacts(
    sourceNodeName?: string,
    targetNodeName?: string,
    factType?: string
  ): Promise<Edge[]> {
    this.logger.debug(
      `Getting facts: source=${sourceNodeName}, target=${targetNodeName}, type=${factType}`
    );

    try {
      const facts = await this.database.getFacts(sourceNodeName, targetNodeName, factType);
      this.logger.info(`Found ${facts.length} facts matching criteria`);
      return facts;
    } catch (error) {
      this.logger.error('Failed to get facts:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<{ database: boolean; llm: boolean; embedding: boolean }> {
    try {
      const databaseHealth = await this.database.healthCheck();
      
      // Simple LLM health check - try to generate a simple response
      let llmHealth = false;
      try {
        const response = await this.llm.generateText('Hello', 'Respond with just "OK"');
        llmHealth = response.includes('OK');
      } catch (error) {
        this.logger.error('LLM health check failed:', error);
        llmHealth = false;
      }
      
      const embeddingHealth = await this.embedder.testConnection();

      return {
        database: databaseHealth,
        llm: llmHealth,
        embedding: embeddingHealth,
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        database: false,
        llm: false,
        embedding: false,
      };
    }
  }
}

export default Graphiti;
