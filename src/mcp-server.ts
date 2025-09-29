import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { Graphiti } from './core/graphiti.js';
import { loadConfig } from './utils/config.js';
import { createLogger } from './utils/logger.js';
import {
  AddEpisodesInputSchema,
  SearchInputSchema,
  GetEntitiesInputSchema,
  GetFactsInputSchema,
} from './types/index.js';

export class GraphitiMcpServer {
  private server: Server;
  private graphiti!: Graphiti;
  private logger = createLogger();

  constructor() {
    this.server = new Server(
      {
        name: 'graphiti-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'add_episodes',
          description: 'Add episodes (text documents) to the knowledge graph',
          inputSchema: {
            type: 'object',
            properties: {
              episodes: {
                type: 'array',
                description: 'List of episodes to add',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Episode name/title' },
                    content: { type: 'string', description: 'Episode content text' },
                    source_description: { type: 'string', description: 'Source description (optional)' },
                    source: { type: 'string', description: 'Source identifier (optional)' },
                    reference_time: { type: 'string', description: 'Reference time for the episode (optional)' },
                  },
                  required: ['name', 'content'],
                },
              },
            },
            required: ['episodes'],
          },
        },
        {
          name: 'search',
          description: 'Search the knowledge graph using semantic, keyword, or hybrid search',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              num_results: { type: 'number', description: 'Number of results to return (1-100)', default: 10 },
              search_type: { type: 'string', enum: ['semantic', 'keyword', 'hybrid'], default: 'hybrid', description: 'Search type' },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_entities',
          description: 'Get entities by name and optionally by type',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Entity name to search for' },
              entity_type: { type: 'string', description: 'Optional entity type filter' },
            },
            required: ['name'],
          },
        },
        {
          name: 'get_facts',
          description: 'Get facts/relationships between entities',
          inputSchema: {
            type: 'object',
            properties: {
              source_node_name: { type: 'string', description: 'Source entity name (optional)' },
              target_node_name: { type: 'string', description: 'Target entity name (optional)' },
              fact_type: { type: 'string', description: 'Fact/relationship type (optional)' },
            },
          },
        },
        {
          name: 'health_check',
          description: 'Check the health status of the Graphiti server',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'add_episodes': {
            const input = AddEpisodesInputSchema.parse(args);
            await this.graphiti.addEpisodes(input.episodes);
            return {
              content: [
                {
                  type: 'text',
                  text: `Successfully added ${input.episodes.length} episodes to the knowledge graph.`,
                },
              ],
            };
          }

          case 'search': {
            const input = SearchInputSchema.parse(args);
            const results = await this.graphiti.search(
              input.query,
              input.num_results,
              input.search_type
            );

            const formattedResults = results
              .map((result, index) => {
                if (result.node) {
                  return `${index + 1}. ${result.node.name} (${result.node.type}) - Score: ${result.score.toFixed(2)}\n   ${result.content}`;
                } else if (result.edge) {
                  return `${index + 1}. ${result.edge.name} - Score: ${result.score.toFixed(2)}\n   ${result.content}`;
                }
                return `${index + 1}. ${result.content} - Score: ${result.score.toFixed(2)}`;
              })
              .join('\n\n');

            return {
              content: [
                {
                  type: 'text',
                  text: `Found ${results.length} results for query "${input.query}":\n\n${formattedResults}`,
                },
              ],
            };
          }

          case 'get_entities': {
            const input = GetEntitiesInputSchema.parse(args);
            const entities = await this.graphiti.getEntities(input.name, input.entity_type);

            if (entities.length === 0) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `No entities found matching name "${input.name}"${input.entity_type ? ` and type "${input.entity_type}"` : ''}.`,
                  },
                ],
              };
            }

            const formattedEntities = entities
              .map((entity, index) => {
                return `${index + 1}. ${entity.name} (${entity.type})\n   Summary: ${entity.summary || 'No summary'}\n   Created: ${entity.created_at}`;
              })
              .join('\n\n');

            return {
              content: [
                {
                  type: 'text',
                  text: `Found ${entities.length} entities:\n\n${formattedEntities}`,
                },
              ],
            };
          }

          case 'get_facts': {
            const input = GetFactsInputSchema.parse(args);
            const facts = await this.graphiti.getFacts(
              input.source_node_name,
              input.target_node_name,
              input.fact_type
            );

            if (facts.length === 0) {
              const filters = [
                input.source_node_name && `source: "${input.source_node_name}"`,
                input.target_node_name && `target: "${input.target_node_name}"`,
                input.fact_type && `type: "${input.fact_type}"`,
              ].filter(Boolean).join(', ');

              return {
                content: [
                  {
                    type: 'text',
                    text: `No facts found${filters ? ` with filters: ${filters}` : ''}.`,
                  },
                ],
              };
            }

            const formattedFacts = facts
              .map((fact, index) => {
                const sourceName = fact.source_node?.name || 'Unknown';
                const targetName = fact.target_node?.name || 'Unknown';
                return `${index + 1}. ${sourceName} --${fact.name}--> ${targetName}\n   Summary: ${fact.summary || 'No summary'}\n   Type: ${fact.type || 'Unknown'}`;
              })
              .join('\n\n');

            return {
              content: [
                {
                  type: 'text',
                  text: `Found ${facts.length} facts:\n\n${formattedFacts}`,
                },
              ],
            };
          }

          case 'health_check': {
            const health = await this.graphiti.healthCheck();
            const status = health.database && health.llm ? 'healthy' : 'unhealthy';
            const details = [
              `Database: ${health.database ? '✓' : '✗'}`,
              `LLM: ${health.llm ? '✓' : '✗'}`,
            ].join('\n');

            return {
              content: [
                {
                  type: 'text',
                  text: `Graphiti server status: ${status}\n\n${details}`,
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run(): Promise<void> {
    try {
      // Load configuration
      const config = loadConfig();
      this.logger.info('Configuration loaded successfully');

      // Initialize Graphiti
      this.graphiti = new Graphiti(config, this.logger);
      await this.graphiti.initialize();
      this.logger.info('Graphiti initialized successfully');

      // Start MCP server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      this.logger.info('Graphiti MCP server is running...');

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        this.logger.info('Received SIGINT, shutting down gracefully...');
        await this.shutdown();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        this.logger.info('Received SIGTERM, shutting down gracefully...');
        await this.shutdown();
        process.exit(0);
      });

    } catch (error) {
      this.logger.error('Failed to start Graphiti MCP server:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    try {
      if (this.graphiti) {
        await this.graphiti.shutdown();
      }
      this.logger.info('Graphiti MCP server shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
    }
  }
}


export function createServer(): GraphitiMcpServer {
  return new GraphitiMcpServer();
}