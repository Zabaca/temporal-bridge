# TemporalBridge 🌉

> AI Memory That Learns Across Time

TemporalBridge transforms Claude Code conversations into a persistent, searchable knowledge base using Zep's temporal knowledge graphs. Every interaction builds connections between concepts, creating an AI memory that grows smarter over time.

## ✨ Features

- **🧠 Persistent Memory**: Conversations automatically stored in Zep's knowledge graph
- **🔍 Intelligent Search**: Query relationships, entities, and conversation history
- **⚡ Temporal Learning**: AI can reference and build upon past interactions
- **🏗️ Robust Architecture**: Handles both short messages and long technical content
- **🕸️ Entity Extraction**: Builds rich relationships between concepts, people, and tools
- **🔗 Context Continuity**: Bridges knowledge across Claude Code sessions

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [PNPM](https://pnpm.io/) package manager
- [Zep Cloud](https://cloud.getzep.com) API key

### Installation

1. Clone or copy this project:
   ```bash
   cd /home/uptown/Projects/zabaca/temporal-bridge
   ```

2. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env and add your ZEP_API_KEY
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

### Basic Usage

**Search your memory:**

Memory search is available through Claude Code's MCP integration. Once configured, use these tools in Claude Code:

- `search_personal` - Search your personal conversation history  
- `search_project` - Search shared project knowledge
- `search_all` - Search both personal and project memories
- `get_recent_episodes` - Get recent conversation context
- `get_current_context` - Get current project context

**Available CLI commands:**
```bash
pnpm run cli hook                    # Run conversation storage hook
pnpm run cli store-conversation     # Store conversation transcript
pnpm run typecheck                  # Type checking
pnpm run format                     # Code formatting
pnpm run lint                       # Lint code
pnpm run test                       # Run tests
```

## 🏗️ Architecture

### Core Components

- **`apps/temporal-bridge-cli/src/lib/memory-tools.ts`** - Memory search and retrieval functions
- **`apps/temporal-bridge-cli/src/commands/hook.command.ts`** - Claude Code hook for auto-storage
- **`apps/temporal-bridge-cli/src/lib/types.ts`** - Shared TypeScript interfaces
- **`apps/temporal-bridge-cli/src/lib/zep-client.ts`** - Zep client utilities
- **`apps/temporal-bridge-cli/src/lib/project-entities.ts`** - Project entity management
- **`apps/temporal-bridge-cli/src/mcp/`** - MCP server integration

### Data Flow

1. **Conversation Happens** → Claude Code interaction
2. **Hook Triggers** → `hook.command.ts` processes transcript via store-conversation command
3. **Smart Storage** → All messages → user graph with project metadata
4. **Knowledge Extraction** → Zep builds entities and relationships
5. **Search & Retrieval** → Memory tools query knowledge graph via CLI or MCP

### Search Scopes

- **Edges**: Relationships and facts ("developer USES graph.add API")
- **Nodes**: Entities with AI-generated summaries
- **Episodes**: Raw conversation content with metadata

## 🔧 Configuration

### Environment Variables

```bash
# Required
ZEP_API_KEY=your_zep_api_key_here

# Optional
DEVELOPER_ID=developer              # Default: "developer"
GROUP_ID=custom-project-group       # Default: auto-generated
PROJECT_DIR=/path/to/project        # Default: current directory
```

### Claude Code Integration

TemporalBridge integrates automatically with Claude Code via:

1. **MCP Server Integration** - Add to your `.mcp.json`:
   ```json
   {
     "temporal-bridge": {
       "command": "node",
       "args": ["/home/uptown/Projects/zabaca/temporal-bridge/apps/temporal-bridge-cli/dist/mcp.js"]
     }
   }
   ```

2. **Automatic Hook Processing** - Conversations are stored automatically via session hooks

## 📚 Documentation

- [Setup Guide](docs/setup.md) - Detailed installation and configuration
- [Usage Guide](docs/usage.md) - Command examples and workflows

## 🎯 Use Cases

- **Context Continuity**: Reference previous conversations across sessions
- **Knowledge Discovery**: Find relationships between concepts and tools
- **Project Memory**: Track technical decisions and implementation details
- **Learning Acceleration**: Build upon past problem-solving approaches

## 🔍 Example MCP Tool Usage

In Claude Code, once MCP is configured, you can use these tools:

```typescript
// Search your personal knowledge
search_personal("typescript functions", 5)

// Search team/project knowledge  
search_project("architecture decisions")

// Combined search across personal and project
search_all("debugging approaches", 10)

// Get recent conversation context
get_recent_episodes(5)

// Get current project information
get_current_context()
```

## 🛠️ Development

```bash
# Type checking
pnpm run typecheck

# Code formatting
pnpm run format

# Linting
pnpm run lint

# Run tests
pnpm run test

# Run CLI directly
pnpm run cli --help
```

## 🤝 Contributing

TemporalBridge was built to bridge conversations across time. Contributions that enhance temporal memory, search capabilities, or integration features are welcome.

## License

AGPL-3.0 License - see [LICENSE](LICENSE) file for details.

### Commercial Licensing

Temporal Bridge is available under the GNU Affero General Public License v3.0 (AGPLv3). This license requires that if you modify Temporal Bridge and offer it as a network service, you must provide the complete source code of your modifications to users.

For organizations that want to use Temporal Bridge in proprietary applications or offer it as a managed service without open-sourcing their modifications, commercial licenses are available. Contact us for commercial licensing options.

---

**TemporalBridge**: Where every conversation becomes part of a larger, evolving understanding.