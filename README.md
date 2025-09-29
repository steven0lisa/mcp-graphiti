# Graphiti MCP Server

A Node.js implementation of the Graphiti temporal knowledge graph system as a Model Context Protocol (MCP) server.

## Features

- **Temporal Knowledge Graph**: Build and query time-aware knowledge graphs
- **Multiple Search Types**: Semantic, keyword, and hybrid search capabilities
- **MCP Integration**: Full Model Context Protocol server implementation
- **Multi-LLM Support**: OpenAI-compatible API integration (supports OpenAI, Moonshot, etc.)
- **Neo4j Database**: High-performance graph database backend
- **NPX Support**: Easy installation and execution via NPX

## Installation

### Via NPX (Recommended)
```bash
npx @zhangzichao2008/mcp-graphiti
```

### Via NPM
```bash
npm install -g @zhangzichao2008/mcp-graphiti
graphiti-mcp
```

### From Source
```bash
git clone https://github.com/steven0lisa/mcp-graphiti.git
cd mcp-graphiti
npm install
npm run build
npm start
```

## Configuration

Create a `.env` file in your project directory:

```env
# Neo4j Database Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j_password
NEO4J_DATABASE=neo4j

# AI Model Configuration (统一配置)
# 支持任何OpenAI兼容的API服务，包括Moonshot、OpenAI、智谱AI等
# LLM和Embedding共享同一套配置
EMBEDDING_API_KEY=your_api_key_here
EMBEDDING_API_URL=https://open.bigmodel.cn/api/paas/v4/embeddings
EMBEDDING_MODEL=embedding-3

# Server Configuration
LOG_LEVEL=info
NODE_ENV=development

# Graphiti Configuration
GRAPHITI_DATABASE=neo4j
GRAPHITI_EMBEDDING_DIMENSION=1536
```

## Usage with Claude Desktop

Add this to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "graphiti": {
      "command": "npx",
      "args": ["@zhangzichao2008/mcp-graphiti"],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "neo4j_password",
        "NEO4J_DATABASE": "neo4j",
        "EMBEDDING_API_KEY": "your_api_key_here",
        "EMBEDDING_API_URL": "https://open.bigmodel.cn/api/paas/v4/embeddings",
        "EMBEDDING_MODEL": "embedding-3"
      }
    }
  }
}
```

## Available Tools

### 1. `add_episodes`
Add text documents (episodes) to the knowledge graph.

**Parameters:**
- `episodes`: Array of episode objects with:
  - `name`: Episode title
  - `content`: Episode text content
  - `source_description`: Optional source description
  - `source`: Optional source identifier
  - `reference_time`: Optional reference time

### 2. `search`
Search the knowledge graph using semantic, keyword, or hybrid search.

**Parameters:**
- `query`: Search query string
- `num_results`: Number of results (1-100, default: 10)
- `search_type`: 'semantic', 'keyword', or 'hybrid' (default: hybrid)

### 3. `get_entities`
Get entities by name and optionally by type.

**Parameters:**
- `name`: Entity name to search for
- `entity_type`: Optional entity type filter

### 4. `get_facts`
Get facts/relationships between entities.

**Parameters:**
- `source_node_name`: Optional source entity name
- `target_node_name`: Optional target entity name
- `fact_type`: Optional relationship type

### 5. `health_check`
Check the health status of the Graphiti server.

## Development

### Setup
```bash
npm install
```

### Development Mode
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Testing
```bash
npm test
npm run test:coverage
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## Architecture

The project follows a modular architecture:

- **`src/types/`**: TypeScript type definitions
- **`src/drivers/`**: Database drivers (Neo4j)
- **`src/llm/`**: LLM client implementations
- **`src/core/`**: Core Graphiti functionality
- **`src/utils/`**: Utility functions
- **`src/mcp-server.ts`**: MCP server implementation

## API Reference

### Graphiti Class

The main class that provides knowledge graph operations:

```typescript
class Graphiti {
  async addEpisodes(episodes: Episode[]): Promise<void>;
  async search(query: string, numResults?: number, searchType?: string): Promise<SearchResult[]>;
  async getEntities(name: string, entityType?: string): Promise<Node[]>;
  async getFacts(sourceNodeName?: string, targetNodeName?: string, factType?: string): Promise<Edge[]>;
  async healthCheck(): Promise<{ database: boolean; llm: boolean }>;
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEO4J_URI` | Neo4j database URI | `bolt://localhost:7687` |
| `NEO4J_USER` | Neo4j username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j password | Required |
| `NEO4J_DATABASE` | Neo4j database name | `neo4j` |
| `EMBEDDING_API_KEY` | AI model API key (OpenAI-compatible) | Required |
| `EMBEDDING_API_URL` | AI model API URL | `https://api.openai.com/v1` |
| `EMBEDDING_MODEL` | AI model name | `gpt-3.5-turbo` |
| `GRAPHITI_EMBEDDING_DIMENSION` | Embedding vector dimension | `1536` |
| `LOG_LEVEL` | Log level | `info` |
| `NODE_ENV` | Node environment | `development` |

## License

Apache 2.0 License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

## Support

For issues and questions:
- GitHub Issues: https://github.com/steven0lisa/mcp-graphiti/issues
- Discord: [Join our Discord server]

## Security

**Important**: Never commit API keys or sensitive information to the repository. Always use environment variables for configuration.