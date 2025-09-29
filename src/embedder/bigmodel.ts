import { EmbeddingConfig } from '../types/index.js';
import { Logger } from '../utils/logger.js';

export interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
    object: string;
  }>;
  model: string;
  object: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export class BigModelEmbedder {
  private config: EmbeddingConfig;
  private logger: Logger;

  constructor(config: EmbeddingConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(this.config.api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.api_key}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          input: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Embedding API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as EmbeddingResponse;
      
      if (!data.data || data.data.length === 0) {
        throw new Error('No embedding data returned from API');
      }

      const embedding = data.data[0].embedding;
      this.logger.debug(`Generated embedding with dimension: ${embedding.length}`);
      
      return embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch(this.config.api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.api_key}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          input: texts,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Embedding API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as EmbeddingResponse;
      
      if (!data.data || data.data.length === 0) {
        throw new Error('No embedding data returned from API');
      }

      const embeddings = data.data
        .sort((a, b) => a.index - b.index)
        .map(item => item.embedding);
      
      this.logger.debug(`Generated ${embeddings.length} embeddings`);
      
      return embeddings;
    } catch (error) {
      this.logger.error('Failed to generate embeddings:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.generateEmbedding('test');
      return true;
    } catch (error) {
      this.logger.error('Embedding service connection test failed:', error);
      return false;
    }
  }
}