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
- **Project Detection**: Uses `project-detector.ts` for consistent user ID generation

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
- Legacy user IDs may require `ZEP_USER_ID` override in `.mcp.json`

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

## Intelligent Memory Usage Instructions

### Active MCP Tools Available
**TemporalBridge MCP Server provides these tools:**
- `mcp__temporal-bridge__search_facts(query, limit, min_rating, reranker)` - Search relationships and facts
- `mcp__temporal-bridge__search_memory(query, scope, limit, reranker)` - Search episodes/entities/content  
- `mcp__temporal-bridge__get_thread_context(thread_id, min_rating)` - Get comprehensive thread context
- `mcp__temporal-bridge__get_recent_episodes(limit)` - Get recent conversation episodes

### Proactive Memory Usage Patterns

**ALWAYS automatically search memory when:**

1. **Starting any conversation** - Get context continuity:
   ```typescript
   mcp__temporal-bridge__get_recent_episodes(5)
   ```

2. **Technical questions or problems** - Find related solutions:
   ```typescript  
   mcp__temporal-bridge__search_memory("problem keywords", "episodes", 3)
   mcp__temporal-bridge__search_facts("solution approaches", 3)
   ```

3. **Code implementation requests** - Look for past patterns:
   ```typescript
   mcp__temporal-bridge__search_memory("implementation topic", "episodes", 5) 
   mcp__temporal-bridge__search_facts("coding patterns", 3)
   ```

4. **Debugging or error resolution** - Reference past debugging sessions:
   ```typescript
   mcp__temporal-bridge__search_memory("error type debugging", "episodes", 3)
   mcp__temporal-bridge__search_facts("debugging approaches", 5)
   ```

5. **Project-specific work** - Auto-retrieve project context:
   ```typescript
   mcp__temporal-bridge__search_memory("project name", "edges", 5)
   mcp__temporal-bridge__search_facts("project architecture", 3)  
   ```

### Memory Integration Guidelines

1. **Search First, Respond Second** - Always check memory before providing answers
2. **Seamless Integration** - Weave memory findings naturally into responses
3. **Don't Mention Searches** - Unless the memory search process itself is relevant to the conversation
4. **Prioritize Recent Context** - Use `get_recent_episodes` for session continuity
5. **Use Appropriate Scope**:
   - `episodes` for conversation history and detailed context
   - `edges` for relationships, facts, and technical patterns  
   - `nodes` for entity summaries and concept overviews

### MCP Server Limitations & Improvements Needed

**Current Limitations:**
1. **No Auto-Trigger Capability** - MCP server can't automatically detect when to search based on message content
2. **Limited Session Awareness** - Cannot automatically identify current thread ID for context retrieval  
3. **Fixed Result Limits** - Cannot dynamically adjust search depth based on query complexity

**Advanced Search Capabilities (Already Working):**
- ✅ **Semantic Similarity Search** - Zep converts queries to embeddings for conceptual matches
- ✅ **Hybrid Search Strategy** - Combines BM25 full-text + semantic embeddings + reranking
- ✅ **Cross Encoder Reranking** - Advanced relevance scoring (0-1 range) for precise results
- ✅ **Multi-Algorithm Fusion** - Reciprocal Rank Fusion combines different search approaches

**Suggested Improvements:**
1. **Add Message Analysis Tool** - `analyze_message_for_memory_triggers(message)` that returns suggested searches
2. **Session Context Tool** - `get_current_session_context()` that automatically uses current thread ID
3. **Smart Search Tool** - `intelligent_search(message, context)` that combines multiple search strategies
4. **Memory Relevance Scoring** - Enhanced ranking of memory results by contextual relevance

**For now, rely on manual pattern recognition and the proactive search patterns above to provide intelligent memory-enhanced responses.**

---

**Note**: This system automatically captures and stores our current conversation. Use the MCP tools above to proactively search and integrate our growing knowledge graph into all responses.