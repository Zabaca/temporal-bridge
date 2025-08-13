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

- [Deno](https://deno.land/) runtime
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
   deno task install
   ```

### Basic Usage

**Search your memory:**
```bash
# Search for specific topics
deno task search --query "typescript functions"

# Search nodes (entities)
deno task search --query "developer" --scope nodes

# Search episodes (conversations)
deno task search --query "memory integration" --scope episodes

# Get thread context
deno task search --thread "claude-code-abc123"
```

**Available commands:**
```bash
deno task search     # Run memory search CLI
deno task hook       # Run conversation storage hook
deno task check      # Type check all files
deno task fmt        # Format code
deno task lint       # Lint code
```

## 🏗️ Architecture

### Core Components

- **`src/retrieve_memory.ts`** - Memory search and retrieval CLI
- **`src/hooks/store_conversation.ts`** - Claude Code hook for auto-storage
- **`src/lib/types.ts`** - Shared TypeScript interfaces
- **`src/lib/zep-client.ts`** - Zep client utilities

### Data Flow

1. **Conversation Happens** → Claude Code interaction
2. **Hook Triggers** → `store_conversation.ts` processes transcript
3. **Smart Storage** → Short messages → thread, Long messages → graph
4. **Knowledge Extraction** → Zep builds entities and relationships
5. **Search & Retrieval** → `retrieve_memory.ts` queries knowledge graph

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
TEMPORAL_BRIDGE_USER_ID=developer
TEMPORAL_BRIDGE_DEFAULT_SCOPE=edges
TEMPORAL_BRIDGE_DEFAULT_LIMIT=10
```

### Claude Code Integration

To integrate with Claude Code hooks:

1. **Copy hook to Claude directory:**
   ```bash
   cp src/hooks/store_conversation.ts /home/uptown/.claude/hooks/
   ```

2. **Or create symlink:**
   ```bash
   ln -sf $(pwd)/src/hooks/store_conversation.ts /home/uptown/.claude/hooks/store_conversation.ts
   ```

## 📚 Documentation

- [Setup Guide](docs/setup.md) - Detailed installation and configuration
- [Usage Guide](docs/usage.md) - Command examples and workflows

## 🎯 Use Cases

- **Context Continuity**: Reference previous conversations across sessions
- **Knowledge Discovery**: Find relationships between concepts and tools
- **Project Memory**: Track technical decisions and implementation details
- **Learning Acceleration**: Build upon past problem-solving approaches

## 🔍 Example Searches

```bash
# Find technical relationships
deno task search --query "graph.add API" --scope edges

# Get entity summaries
deno task search --query "store_conversation.ts" --scope nodes

# Search conversation history
deno task search --query "debugging approaches" --scope episodes

# Thread-specific context
deno task search --thread "claude-code-f381f5fb-b0dd-4e66-8e82-5764e505579c"
```

## 🛠️ Development

```bash
# Type checking
deno task check

# Code formatting
deno task fmt

# Linting
deno task lint

# Run search CLI directly
deno run --allow-env --allow-net src/retrieve_memory.ts --help
```

## 🤝 Contributing

TemporalBridge was built to bridge conversations across time. Contributions that enhance temporal memory, search capabilities, or integration features are welcome.

## 📄 License

Part of the uptownhr project ecosystem.

---

**TemporalBridge**: Where every conversation becomes part of a larger, evolving understanding.