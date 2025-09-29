import { LLMConfig } from '../types/index.js';
import { Logger } from '../utils/logger.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAICompatibleClient {
  private apiKey: string;
  private apiUrl: string;
  private model: string;
  private logger: Logger;

  constructor(config: LLMConfig, logger: Logger) {
    this.apiKey = config.api_key;
    this.apiUrl = config.api_url || 'https://api.openai.com/v1';
    this.model = config.model || 'gpt-3.5-turbo';
    this.logger = logger;
  }

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    try {
      this.logger.debug('Sending request to OpenAI Compatible API:', {
        model: this.model,
        messageCount: messages.length,
      });

      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.1,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI Compatible API error: ${response.status} ${errorText}`);
      }

      const data: any = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response choices from OpenAI Compatible API');
      }

      const content = data.choices[0].message?.content || '';

      this.logger.debug('Received response from OpenAI Compatible API:', {
        contentLength: content.length,
        usage: data.usage,
      });

      return {
        content,
        usage: data.usage,
      };
    } catch (error) {
      this.logger.error('Failed to call OpenAI Compatible API:', error);
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

export default OpenAICompatibleClient;
