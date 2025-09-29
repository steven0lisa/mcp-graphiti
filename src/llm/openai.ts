import OpenAI from 'openai';
import { LLMConfig } from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { ChatMessage, ChatResponse } from './openai-compatible.js';

export class OpenAIClient {
  private client: OpenAI;
  private model: string;
  private logger: Logger;

  constructor(config: LLMConfig, logger: Logger) {
    this.client = new OpenAI({
      apiKey: config.api_key,
    });
    this.model = config.model || 'gpt-3.5-turbo';
    this.logger = logger;
  }

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    try {
      this.logger.debug('Sending request to OpenAI:', {
        model: this.model,
        messageCount: messages.length,
      });

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages as any,
        temperature: 0.1,
        max_tokens: 4000,
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response choices from OpenAI');
      }

      const content = response.choices[0].message?.content || '';

      this.logger.debug('Received response from OpenAI:', {
        contentLength: content.length,
        usage: response.usage,
      });

      return {
        content,
        usage: response.usage
          ? {
              prompt_tokens: response.usage.prompt_tokens,
              completion_tokens: response.usage.completion_tokens,
              total_tokens: response.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to call OpenAI:', error);
      throw error;
    }
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await this.chat(messages);
    return response.content;
  }

  async extractEntities(text: string): Promise<any> {
    const systemPrompt = `You are an expert at extracting entities from text.
    Extract all entities (people, organizations, locations, concepts, etc.) from the given text.
    Return a JSON array with each entity containing: name, type, and a brief description.
    Example: [{"name": "John Doe", "type": "person", "description": "Software engineer"}]`;

    const userPrompt = `Extract entities from this text: ${text}`;

    try {
      const response = await this.generateText(userPrompt, systemPrompt);

      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error) {
      this.logger.error('Failed to extract entities:', error);
      return [];
    }
  }

  async extractRelationships(text: string, entities: any[]): Promise<any> {
    const systemPrompt = `You are an expert at extracting relationships between entities from text.
    Given a text and a list of entities, extract all relationships between these entities.
    Return a JSON array with each relationship containing: source_entity, target_entity, relationship_type, and description.
    Example: [{"source_entity": "John Doe", "target_entity": "Microsoft", "relationship_type": "works_at", "description": "John works at Microsoft"}]`;

    const userPrompt = `Text: ${text}\n\nEntities: ${JSON.stringify(entities)}\n\nExtract relationships between these entities.`;

    try {
      const response = await this.generateText(userPrompt, systemPrompt);

      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return [];
    } catch (error) {
      this.logger.error('Failed to extract relationships:', error);
      return [];
    }
  }

  async generateSummary(text: string, maxLength: number = 200): Promise<string> {
    const systemPrompt = `You are an expert at creating concise summaries.
    Create a summary of the given text that is no longer than ${maxLength} characters.
    Focus on the key points and main ideas.`;

    try {
      const response = await this.generateText(text, systemPrompt);
      return response.trim();
    } catch (error) {
      this.logger.error('Failed to generate summary:', error);
      return text.substring(0, maxLength);
    }
  }
}

export default OpenAIClient;
