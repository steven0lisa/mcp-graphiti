import neo4j, { Driver } from 'neo4j-driver';
import { DatabaseConfig, Node, Edge } from '../types/index.js';
import { Logger } from '../utils/logger.js';

export class Neo4jDriver {
  private driver: Driver;
  private logger: Logger;
  private database?: string;

  constructor(config: DatabaseConfig, logger: Logger) {
    this.driver = neo4j.driver(config.uri, neo4j.auth.basic(config.user, config.password), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 60000,
    });
    this.logger = logger;
    this.database = config.database;
  }

  async connect(): Promise<void> {
    try {
      await this.driver.verifyConnectivity();
      this.logger.info('Successfully connected to Neo4j database');
    } catch (error) {
      this.logger.error('Failed to connect to Neo4j database:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
    this.logger.info('Neo4j driver closed');
  }

  async runQuery(query: string, parameters: Record<string, any> = {}): Promise<any> {
    const session = this.driver.session({ database: this.database });
    try {
      this.logger.debug('Executing Neo4j query:', query, parameters);
      const result = await session.run(query, parameters);
      return result.records.map((record) => record.toObject());
    } catch (error) {
      this.logger.error('Neo4j query failed:', query, parameters, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async addNodes(nodes: Node[]): Promise<void> {
    const query = `
      UNWIND $nodes AS node
      CREATE (n:Entity {
        id: node.id,
        type: node.type,
        name: node.name,
        summary: node.summary,
        created_at: node.created_at,
        valid_at: node.valid_at,
        invalid_at: node.invalid_at
      })
      SET n += node.attributes
    `;

    try {
      await this.runQuery(query, { nodes });
      this.logger.info(`Added ${nodes.length} nodes to the database`);
    } catch (error) {
      this.logger.error('Failed to add nodes:', error);
      throw error;
    }
  }

  async addEdges(edges: Edge[]): Promise<void> {
    const query = `
      UNWIND $edges AS edge
      MATCH (source:Entity {id: edge.source_id})
      MATCH (target:Entity {id: edge.target_id})
      CREATE (source)-[r:RELATIONSHIP {
        id: edge.id,
        type: edge.type,
        name: edge.name,
        summary: edge.summary,
        created_at: edge.created_at,
        valid_at: edge.valid_at,
        invalid_at: edge.invalid_at
      }]->(target)
      SET r += edge.attributes
    `;

    try {
      await this.runQuery(query, { edges });
      this.logger.info(`Added ${edges.length} edges to the database`);
    } catch (error) {
      this.logger.error('Failed to add edges:', error);
      throw error;
    }
  }

  async searchNodes(query: string, limit: number = 10): Promise<Node[]> {
    const cypherQuery = `
      MATCH (n:Entity)
      WHERE n.name CONTAINS $query
      RETURN n, 1.0 as score
      LIMIT $limit
    `;

    try {
      const results = await this.runQuery(cypherQuery, { query, limit });
      return results.map((record: any) => ({
        ...record.node.properties,
        score: record.score,
      }));
    } catch (error) {
      this.logger.error('Node search failed:', error);
      throw error;
    }
  }

  async searchByName(name: string, type?: string): Promise<Node[]> {
    let query = `
      MATCH (n:Entity)
      WHERE n.name CONTAINS $name
    `;

    const params: Record<string, any> = { name };

    if (type) {
      query += ` AND n.type = $type`;
      params.type = type;
    }

    query += ` RETURN n`;

    try {
      const results = await this.runQuery(query, params);
      return results.map((record: any) => record.n.properties);
    } catch (error) {
      this.logger.error('Name search failed:', error);
      throw error;
    }
  }

  async getFacts(sourceName?: string, targetName?: string, factType?: string): Promise<Edge[]> {
    let query = `
      MATCH (source:Entity)-[r:RELATIONSHIP]->(target:Entity)
      WHERE 1=1
    `;

    const params: Record<string, any> = {};

    if (sourceName) {
      query += ` AND source.name CONTAINS $sourceName`;
      params.sourceName = sourceName;
    }

    if (targetName) {
      query += ` AND target.name CONTAINS $targetName`;
      params.targetName = targetName;
    }

    if (factType) {
      query += ` AND r.type = $factType`;
      params.factType = factType;
    }

    query += ` RETURN r, source, target`;

    try {
      const results = await this.runQuery(query, params);
      return results.map((record: any) => ({
        ...record.r.properties,
        source_node: record.source.properties,
        target_node: record.target.properties,
      }));
    } catch (error) {
      this.logger.error('Fact retrieval failed:', error);
      throw error;
    }
  }

  async createIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX entity_id IF NOT EXISTS FOR (n:Entity) ON (n.id)',
      'CREATE INDEX entity_name IF NOT EXISTS FOR (n:Entity) ON (n.name)',
      'CREATE INDEX entity_type IF NOT EXISTS FOR (n:Entity) ON (n.type)',
      'CREATE INDEX relationship_id IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.id)',
      'CREATE INDEX relationship_type IF NOT EXISTS FOR ()-[r:RELATIONSHIP]-() ON (r.type)',
    ];

    for (const indexQuery of indexes) {
      try {
        await this.runQuery(indexQuery);
        this.logger.debug(`Created index: ${indexQuery}`);
      } catch (error) {
        this.logger.warn(`Failed to create index (may already exist): ${indexQuery}`);
      }
    }
  }

  async vectorSearch(queryEmbedding: number[], limit: number = 10): Promise<Array<{node: Node, score: number}>> {
    // For now, fallback to keyword search since vector search requires additional Neo4j setup
    // In a full implementation, this would use Neo4j's vector index capabilities
    this.logger.warn('Vector search not implemented, falling back to text search');
    
    const nodes = await this.searchNodes('', limit);
    return nodes.map(node => ({
      node,
      score: 0.5 // Default similarity score
    }));
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.driver.verifyConnectivity();
      return true;
    } catch (error) {
      this.logger.error('Neo4j health check failed:', error);
      return false;
    }
  }
}

export default Neo4jDriver;
