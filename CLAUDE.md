# TemporalBridge - Claude Project Configuration

## Project Overview
TemporalBridge is an AI memory system that creates searchable, temporal knowledge graphs from Claude Code conversations using Zep. It bridges conversations across time, providing persistent memory that learns and evolves.

**Location**: `~/Projects/zabaca/temporal-bridge/`  
**Purpose**: AI memory management and search for Claude Code sessions  
**Tech Stack**: Deno, TypeScript, Zep Cloud API

## Key Components

### Core Scripts
- `src/retrieve_memory.ts` - Memory search and retrieval CLI
- `src/hooks/store_conversation.ts` - Conversation storage hook
- `src/lib/types.ts` - Shared TypeScript interfaces
- `src/lib/zep-client.ts` - Zep client utilities

### Available Commands
```bash
# Navigate to project
cd ~/Projects/zabaca/temporal-bridge

# Search memories
deno task search --query "concept" --scope edges|nodes|episodes
deno task search --thread "claude-code-session-id" 
deno task search --help

# Development
deno task check    # Type checking
deno task fmt      # Format code  
deno task lint     # Lint code
```

## Memory Search Patterns

### Search Scopes
- **edges**: Relationships and facts ("developer USES TypeScript")
- **nodes**: Entities with AI-generated summaries  
- **episodes**: Raw conversation content

### Common Queries
```bash
# Find technical relationships
deno task search --query "debugging approaches" --scope edges

# Get entity summaries  
deno task search --query "developer" --scope nodes

# Search conversation history
deno task search --query "project architecture" --scope episodes

# Thread-specific context
deno task search --thread "claude-code-f381f5fb-b0dd-4e66-8e82-5764e505579c"
```

## Integration Status

### Claude Code Hook
- **Status**: ✅ Active via Deno task integration
- **Trigger**: `cd ~/Projects/zabaca/temporal-bridge && deno task hook`
- **Storage**: Short messages → thread, Large messages → graph
- **Debug Files**: `/home/uptown/.claude/temporal-bridge-debug-*.json`

### MCP Server Integration
- **Status**: ✅ Configured for direct memory access
- **Servers**: 
  - `zep-docs`: Zep documentation via SSE
  - `temporal-bridge`: Direct memory search tools
- **Tools Available**:
  - `search_facts`: Search relationships and facts
  - `search_memory`: Search episodes/entities/content
  - `get_thread_context`: Get comprehensive thread context
- **Configuration**: `.mcp.json` in project root

### Environment
- **Required**: `ZEP_API_KEY` (set in project `.env`)
- **User ID**: `developer` (default)
- **Thread Pattern**: `claude-code-{session-id}`

## Development Guidelines

### When Working on TemporalBridge
1. **Always run from project directory**: `cd ~/Projects/zabaca/temporal-bridge`
2. **Test changes**: `deno task check` before committing
3. **Search functionality**: Test with `deno task search` after changes
4. **Hook integration**: Verify via debug files after conversations

### Memory Usage Patterns
- **Reference past work**: Search before implementing similar features
- **Context building**: Use thread searches for session continuity  
- **Knowledge discovery**: Explore nodes for concept relationships
- **Problem solving**: Search episodes for similar issues

## Zep Integration Details

### API Endpoints Used
- `client.graph.search()` - Knowledge graph search
- `client.thread.getUserContext()` - Thread context retrieval
- `client.thread.addMessages()` - Short message storage
- `client.graph.add()` - Large message/episode storage

### Search Response Structure
```typescript
// Edges: Relationships
{ edge: { fact: string, score: number, createdAt: string } }

// Nodes: Entities  
{ node: { name: string, summary: string, score: number } }

// Episodes: Conversations
{ episode: { content: string, processed: boolean, roleType: string } }
```

## MCP Tool Usage

### For Claude (via MCP tools)
```typescript
// I can now call these directly during conversations:
search_facts("TypeScript preferences")
search_memory("debugging approaches", "episodes") 
get_thread_context("claude-code-session-id")
```

### For CLI usage
```bash
deno task search --query "topic" --scope edges|nodes|episodes
deno task mcp  # Start MCP server manually
```

## Current Limitations
- CLI search returns max 300 chars (see `retrieve_memory.ts:287`)
- Hook debug logging creates files in `.claude/` directory
- Some API responses use `any` types for Zep SDK compatibility
- MCP server requires project-specific configuration

## Enhanced Capabilities
- ✅ Direct memory tool access via MCP
- ✅ Structured JSON responses for all operations
- ✅ Multi-scope search (edges, nodes, episodes)
- ✅ Thread context summaries
- ✅ Project-specific Zep documentation access

## AI Coding Assistant Documentation

### Zep Documentation Reference
Local copy of Zep's comprehensive documentation index available at:
- **File**: `docs/zep-llms.txt`
- **Source**: `https://help.getzep.com/llms.txt`

**Documentation Coverage:**
- **Core Concepts**: Context engineering, temporal knowledge graphs, memory management
- **API References**: Complete SDK documentation for threads, users, graph operations  
- **Integration Guides**: LangGraph, Autogen, and ecosystem integrations
- **Migration Guides**: v2 to v3 platform upgrades, Mem0 migration
- **Performance**: Optimization patterns and best practices
- **Graphiti**: Open-source temporal knowledge graph library

**For AI Development:**
- Reference local `docs/zep-llms.txt` for complete API coverage
- Use Zep docs MCP server (`mcp__zep-docs__search_documentation`) for real-time documentation access
- Leverage both current (v3) and legacy (v2) documentation as needed

### Development Context
When working on TemporalBridge enhancements:
1. **Check local docs first** - Reference `docs/zep-llms.txt` for comprehensive API coverage
2. **Search Zep docs** via MCP tools for implementation patterns and examples
3. **Use memory search** to understand past implementation decisions and patterns
4. **Follow Zep best practices** from official documentation for optimal performance

---

**Note**: This system automatically captures and stores our current conversation. Use search commands to explore the growing knowledge graph of our collaborative work.