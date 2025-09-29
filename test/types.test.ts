import {
  NodeSchema,
  EdgeSchema,
  GraphSchema,
  AddEpisodesInputSchema,
  SearchInputSchema,
  GetEntitiesInputSchema,
  GetFactsInputSchema,
} from '../src/types/index.js';

describe('Type Validation', () => {
  describe('NodeSchema', () => {
    it('should validate a valid node', () => {
      const validNode = {
        id: 'test-id',
        type: 'person',
        name: 'John Doe',
        summary: 'Software engineer',
        created_at: '2023-01-01T00:00:00Z',
        valid_at: '2023-01-01T00:00:00Z',
        invalid_at: undefined,
        attributes: { company: 'Tech Corp' },
      };

      const result = NodeSchema.safeParse(validNode);
      expect(result.success).toBe(true);
    });

    it('should reject a node without required fields', () => {
      const invalidNode = {
        id: 'test-id',
        // missing type
        name: 'John Doe',
        created_at: '2023-01-01T00:00:00Z',
      };

      const result = NodeSchema.safeParse(invalidNode);
      expect(result.success).toBe(false);
    });
  });

  describe('EdgeSchema', () => {
    it('should validate a valid edge', () => {
      const validEdge = {
        id: 'edge-1',
        type: 'works_at',
        source_id: 'person-1',
        target_id: 'company-1',
        name: 'works at',
        summary: 'John works at Tech Corp',
        created_at: '2023-01-01T00:00:00Z',
        valid_at: '2023-01-01T00:00:00Z',
        invalid_at: undefined,
        attributes: { start_date: '2020-01-01' },
      };

      const result = EdgeSchema.safeParse(validEdge);
      expect(result.success).toBe(true);
    });

    it('should reject an edge without required fields', () => {
      const invalidEdge = {
        id: 'edge-1',
        // missing source_id
        target_id: 'company-1',
        name: 'works at',
        created_at: '2023-01-01T00:00:00Z',
      };

      const result = EdgeSchema.safeParse(invalidEdge);
      expect(result.success).toBe(false);
    });
  });

  describe('AddEpisodesInputSchema', () => {
    it('should validate valid episode input', () => {
      const validInput = {
        episodes: [
          {
            name: 'Episode 1',
            content: 'This is the content of episode 1',
            source_description: 'Test source',
            source: 'test-source',
            reference_time: '2023-01-01T00:00:00Z',
          },
        ],
      };

      const result = AddEpisodesInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept episodes with minimal required fields', () => {
      const minimalInput = {
        episodes: [
          {
            name: 'Episode 1',
            content: 'Content',
          },
        ],
      };

      const result = AddEpisodesInputSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });

    it('should reject empty episodes array', () => {
      const invalidInput = {
        episodes: [],
      };

      const result = AddEpisodesInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('SearchInputSchema', () => {
    it('should validate valid search input', () => {
      const validInput = {
        query: 'software engineer',
        num_results: 10,
        search_type: 'hybrid',
      };

      const result = SearchInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept minimal search input', () => {
      const minimalInput = {
        query: 'test query',
      };

      const result = SearchInputSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
      expect(result.data?.num_results).toBe(10);
      expect(result.data?.search_type).toBe('hybrid');
    });

    it('should reject invalid num_results', () => {
      const invalidInput = {
        query: 'test',
        num_results: 200, // exceeds max of 100
      };

      const result = SearchInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid search_type', () => {
      const invalidInput = {
        query: 'test',
        search_type: 'invalid_type',
      };

      const result = SearchInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('GetEntitiesInputSchema', () => {
    it('should validate valid entity input', () => {
      const validInput = {
        name: 'John Doe',
        entity_type: 'person',
      };

      const result = GetEntitiesInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept minimal entity input', () => {
      const minimalInput = {
        name: 'John Doe',
      };

      const result = GetEntitiesInputSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });
  });

  describe('GetFactsInputSchema', () => {
    it('should validate valid facts input', () => {
      const validInput = {
        source_node_name: 'John Doe',
        target_node_name: 'Microsoft',
        fact_type: 'works_at',
      };

      const result = GetFactsInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept empty facts input', () => {
      const emptyInput = {};

      const result = GetFactsInputSchema.safeParse(emptyInput);
      expect(result.success).toBe(true);
    });

    it('should accept partial facts input', () => {
      const partialInput = {
        source_node_name: 'John Doe',
      };

      const result = GetFactsInputSchema.safeParse(partialInput);
      expect(result.success).toBe(true);
    });
  });
});