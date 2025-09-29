import { LLMConfig } from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { MoonshotClient } from './moonshot.js';
import { OpenAIClient } from './openai.js';

export interface LLMClient {
  chat(messages: any[]): Promise<any>;
  generateText(prompt: string, systemPrompt?: string): Promise<string>;
  extractEntities(text: string): Promise<any[]>;
  extractRelationships(text: string, entities: any[]): Promise<any[]>;
  generateSummary(text: string, maxLength?: number): Promise<string>;
}

export function createLLMClient(config: LLMConfig, logger: Logger): LLMClient {
  switch (config.provider) {
    case 'moonshot':
      return new MoonshotClient(config, logger);
    case 'openai':
      return new OpenAIClient(config, logger);
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

export { MoonshotClient } from './moonshot.js';
export { OpenAIClient } from './openai.js';
export type { ChatMessage, ChatResponse } from './moonshot.js';
