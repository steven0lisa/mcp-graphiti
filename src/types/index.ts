import { z } from 'zod';

// Basic Graph Types
export const NodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  summary: z.string().optional(),
  created_at: z.string(),
  valid_at: z.string().optional(),
  invalid_at: z.string().optional(),
  attributes: z.record(z.any()).optional(),
});

export const EdgeSchema = z.object({
  id: z.string(),
  type: z.string(),
  source_id: z.string(),
  target_id: z.string(),
  name: z.string(),
  summary: z.string().optional(),
  created_at: z.string(),
  valid_at: z.string().optional(),
  invalid_at: z.string().optional(),
  attributes: z.record(z.any()).optional(),
  source_node: NodeSchema.optional(),
  target_node: NodeSchema.optional(),
});

export const GraphSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

// MCP Tool Input/Output Types
export const AddEpisodesInputSchema = z.object({
  episodes: z
    .array(
      z.object({
        name: z.string(),
        content: z.string(),
        source_description: z.string().optional(),
        source: z.string().optional(),
        reference_time: z.string().optional(),
      })
    )
    .min(1, 'At least one episode is required'),
});

export const SearchInputSchema = z.object({
  query: z.string(),
  num_results: z.number().int().min(1).max(100).default(10),
  center_node_uuid: z.string().optional(),
  search_type: z.enum(['semantic', 'keyword', 'hybrid']).default('hybrid'),
});

export const GetEntitiesInputSchema = z.object({
  name: z.string(),
  entity_type: z.string().optional(),
});

export const GetFactsInputSchema = z.object({
  source_node_name: z.string().optional(),
  target_node_name: z.string().optional(),
  fact_type: z.string().optional(),
});

// Database Configuration
export const DatabaseConfigSchema = z.object({
  uri: z.string(),
  user: z.string(),
  password: z.string(),
  database: z.string().optional(),
});

// LLM Configuration (OpenAI Compatible API)
export const LLMConfigSchema = z.object({
  provider: z.literal('openai'), // 统一使用openai协议
  api_key: z.string(),
  api_url: z.string().optional(),
  model: z.string().optional(),
});

// Embedding Configuration (智谱AI)
export const EmbeddingConfigSchema = z.object({
  api_key: z.string(),
  api_url: z.string(),
  model: z.string(),
});

// Graphiti Configuration
export const GraphitiConfigSchema = z.object({
  database: DatabaseConfigSchema,
  llm: LLMConfigSchema,
  embedding: EmbeddingConfigSchema,
  embedding_dimension: z.number().int().default(1536),
  log_level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Export types
export type Node = z.infer<typeof NodeSchema>;
export type Edge = z.infer<typeof EdgeSchema>;
export type Graph = z.infer<typeof GraphSchema>;

export type AddEpisodesInput = z.infer<typeof AddEpisodesInputSchema>;
export type SearchInput = z.infer<typeof SearchInputSchema>;
export type GetEntitiesInput = z.infer<typeof GetEntitiesInputSchema>;
export type GetFactsInput = z.infer<typeof GetFactsInputSchema>;

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type EmbeddingConfig = z.infer<typeof EmbeddingConfigSchema>;
export type GraphitiConfig = z.infer<typeof GraphitiConfigSchema>;

// Episode and Search Result Types
export interface Episode {
  name: string;
  content: string;
  source_description?: string;
  source?: string;
  reference_time?: string;
}

export interface SearchResult {
  node?: Node;
  edge?: Edge;
  score: number;
  content: string;
}

export interface SearchResults {
  results: SearchResult[];
  query: string;
  search_type: string;
}
