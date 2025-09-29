import { LLMConfig } from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { OpenAICompatibleClient } from './openai-compatible.js';
import { OpenAIClient } from './openai.js';

export interface LLMClient {
  chat(messages: any[]): Promise<any>;
  generateText(prompt: string, systemPrompt?: string): Promise<string>;
  extractEntities(text: string): Promise<any[]>;
  extractRelationships(text: string, entities: any[]): Promise<any[]>;
  generateSummary(text: string, maxLength?: number): Promise<string>;
}

export function createLLMClient(config: LLMConfig, logger: Logger): LLMClient {
  // 统一使用OpenAI兼容客户端，支持任何OpenAI兼容的API服务
  return new OpenAICompatibleClient(config, logger);
}

export { OpenAICompatibleClient } from './openai-compatible.js';
export { OpenAIClient } from './openai.js';
export type { ChatMessage, ChatResponse } from './openai-compatible.js';
