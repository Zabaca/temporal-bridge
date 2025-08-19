# TemporalBridge - Claude Project Configuration

## Project Overview
TemporalBridge is an AI memory system that creates searchable, temporal knowledge graphs from Claude Code conversations using Zep. It implements a **User Graph Architecture** where personal conversations are stored in your user graph, and shared knowledge is manually curated into project groups.

**Location**: `~/Projects/zabaca/temporal-bridge/`  
**Purpose**: AI memory management and search for Claude Code sessions  
**Tech Stack**: Deno, TypeScript, Zep Cloud API  
**Architecture**: User Graph with Project Group sharing

## User Graph Architecture

### Storage Strategy
- **User Graph**: All conversations stored under single developer ID (`developer`)
- **Project Groups**: Shared knowledge manually curated via `/share-knowledge` command
- **Clean Separation**: Personal learnings vs. team knowledge
- **Manual Curation**: Deliberate knowledge sharing prevents noise

### Key Benefits
- ✅ **Simplified Identity**: Single user ID across all projects
- ✅ **Privacy by Default**: Personal conversations stay private
- ✅ **Intentional Sharing**: Only valuable insights reach team knowledge
- ✅ **Cross-Project Learning**: Personal patterns span multiple projects
- ✅ **Flexible Search**: Choose personal, project, or combined search

## Core Components

### Storage & Hooks
- `src/hooks/store_conversation.ts` - Stores all conversations in user graph
- `src/lib/project-detector.ts` - Detects project context for metadata
- `src/lib/zep-client.ts` - Simplified user ID management

### Memory Tools
- `src/lib/memory-tools.ts` - Personal and project search functions
- `src/mcp-server.ts` - MCP tools for direct Claude integration
- `src/retrieve_memory.ts` - CLI search interface

### Available Commands
```bash
# Navigate to project
cd ~/Projects/zabaca/temporal-bridge

# Search personal memories
deno task search --query "debugging approaches" --scope episodes

# Development
deno task check    # Type checking
deno task fmt      # Format code  
deno task lint     # Lint code
```

## New MCP Tools (User Graph Architecture)

### Personal Knowledge Search
- **`search_personal`** - Search your personal conversation history only
- **Use for**: "What debugging techniques have I used?", "My preferences for testing"

### Project Knowledge Search  
- **`search_project`** - Search shared project knowledge only
- **Use for**: "What architecture decisions has the team made?", "Project conventions"

### Combined Search
- **`search_all`** - Search both personal and project memories with source labels
- **Use for**: "What do I know about React patterns?" (gets both personal experience and team decisions)

### Knowledge Sharing
- **`share_knowledge`** - Copy insights from personal conversations to project groups
- **Use for**: Sharing valuable learnings, decisions, patterns with the team

### Context & History
- **`get_thread_context`** - Get comprehensive context for specific conversation threads
- **`get_recent_episodes`** - Get recent conversation episodes for continuity
- **`get_current_context`** - Get current session context automatically

## Integration Status

### Claude Code Hook
- **Status**: ✅ Active - stores all conversations in user graph
- **Trigger**: Automatic via conversation hooks
- **Storage**: All messages → user graph with project metadata
- **Debug Files**: `/home/uptown/.claude/temporal-bridge-debug-*.json`
- **Thread IDs**: Simplified to `claude-code-{session-id}`

### MCP Server Integration
- **Status**: ✅ Configured for new architecture
- **Configuration**: `.mcp.json` in project root
- **Tools**: 6 new tools replacing old search methods
- **Architecture**: User graph storage with project group sharing

### Environment Configuration
```bash
# Required
ZEP_API_KEY=your_zep_api_key_here

# Optional
DEVELOPER_ID=your_name              # Default: "developer"
GROUP_ID=custom-project-group       # Default: auto-generated
PROJECT_DIR=/path/to/project        # Default: current directory
```

## Memory Usage Patterns

### When to Use Each Search Tool

**`search_personal`** - Your personal knowledge only:
- "What patterns have I learned for error handling?"
- "My debugging approaches that worked well"
- "Personal preferences and habits"

**`search_project`** - Shared team knowledge only:
- "What conventions has the team established?"
- "Architecture decisions we've made"
- "Shared patterns and best practices"

**`search_all`** - Comprehensive search:
- "Everything I know about React components"
- "All context about database design" 
- "Complete picture of testing approaches"

**`share_knowledge`** - Curate team knowledge:
- Share valuable insights: "We decided to use TypeScript strict mode for better type safety"
- Document decisions: "Authentication flow should use JWT with refresh tokens"
- Preserve lessons learned: "Memory leaks in React occur when event listeners aren't cleaned up"

## Proactive Memory Usage

### ALWAYS automatically search memory when:

1. **Starting conversations** - Get context continuity:
   ```typescript
   mcp__temporal-bridge__get_recent_episodes(5)
   ```

2. **Technical questions** - Find related solutions:
   ```typescript
   mcp__temporal-bridge__search_all("error handling patterns", 5)
   ```

3. **Implementation requests** - Look for past patterns:
   ```typescript
   mcp__temporal-bridge__search_personal("similar implementation", 5)
   mcp__temporal-bridge__search_project("team patterns", 3)
   ```

4. **Debugging issues** - Reference past solutions:
   ```typescript
   mcp__temporal-bridge__search_all("debugging approaches", 5)
   ```

5. **Project-specific work** - Get relevant context:
   ```typescript
   mcp__temporal-bridge__search_project("project architecture", 5)
   ```

## Development Guidelines

### When Working on TemporalBridge
1. **Run from project directory**: `cd ~/Projects/zabaca/temporal-bridge`
2. **Test changes**: `deno task check` before committing
3. **Verify MCP tools**: Test new search tools after changes
4. **Check hook storage**: Verify conversations stored in user graph

### Knowledge Curation Workflow
1. **Develop personally** - All conversations stored in your user graph
2. **Identify insights** - Notice valuable patterns, decisions, learnings
3. **Share deliberately** - Use `share_knowledge` to copy to project group
4. **Search comprehensively** - Use `search_all` for complete context

## Advanced Capabilities

### Semantic Search Features
- ✅ **Hybrid Search** - Combines BM25 full-text + semantic embeddings
- ✅ **Cross Encoder Reranking** - Advanced relevance scoring
- ✅ **Multi-Algorithm Fusion** - Optimal result ranking
- ✅ **Project Context Awareness** - Automatic project detection

### Architecture Benefits
- ✅ **Single User Identity** - No more project-scoped user IDs
- ✅ **Manual Knowledge Curation** - Intentional team knowledge building
- ✅ **Privacy by Default** - Personal conversations stay private
- ✅ **Flexible Search Options** - Personal, project, or combined search
- ✅ **Cross-Project Learning** - Personal patterns span all projects

## Search Response Structure

### Personal Search Results
```typescript
{
  "source": "personal",
  "results": [
    {
      "content": "Your personal insight or pattern",
      "score": 0.95,
      "type": "episode",
      "metadata": { "scope": "personal", "project": "context" }
    }
  ]
}
```

### Project Search Results
```typescript
{
  "source": "project", 
  "project": "temporal-bridge",
  "groupId": "project-zabaca-temporal-bridge",
  "results": [
    {
      "content": "Shared team knowledge",
      "score": 0.87,
      "type": "edge",
      "metadata": { "scope": "group_edges", "sharedBy": "developer" }
    }
  ]
}
```

### Combined Search Results
```typescript
{
  "query": "React patterns",
  "project": "temporal-bridge", 
  "personal": [...], // Your personal React experience
  "project_results": [...] // Team's React decisions
}
```

## Memory Integration Guidelines

1. **Search First, Respond Second** - Check memory before answering
2. **Seamless Integration** - Weave findings naturally into responses  
3. **Source Awareness** - Distinguish personal vs. project knowledge
4. **Context Building** - Use recent episodes for conversation continuity
5. **Intentional Sharing** - Curate valuable insights to project groups

## Migration from Legacy Architecture

### What Changed
- **User IDs**: Project-scoped IDs → Single developer ID
- **Storage**: Automatic project routing → User graph with metadata
- **Sharing**: Automatic → Manual via `share_knowledge` tool
- **Search**: Generic tools → Specialized personal/project/combined tools

### Legacy Tools (Removed)
- ~~`search_facts`~~ → Use `search_personal`, `search_project`, or `search_all`
- ~~`search_memory`~~ → Use new specialized search tools
- ~~Project-scoped user IDs~~ → Single `DEVELOPER_ID`

### Environment Variables (Updated)
- ~~`ZEP_USER_ID`~~ → `DEVELOPER_ID`
- **New**: `GROUP_ID` for custom project group names
- **Simplified**: No more complex project-scoped configurations

## AI Coding Assistant Instructions

### Memory-Enhanced Development
1. **Always search first** - Use memory tools before answering technical questions
2. **Build on past work** - Reference previous implementations and decisions
3. **Share valuable insights** - Use `share_knowledge` for team-worthy discoveries
4. **Maintain context** - Use `get_recent_episodes` for conversation continuity
5. **Choose appropriate scope** - Personal for your experience, project for team knowledge

### Automatic Memory Integration
TemporalBridge automatically:
- Stores all conversations in your user graph
- Adds project metadata for context
- Enables cross-project learning
- Provides tools for deliberate knowledge sharing

**Use the MCP tools proactively to provide context-aware, memory-enhanced assistance across all development tasks.**

---

**Note**: This system stores all conversations in your personal user graph. Use `share_knowledge` to deliberately share valuable insights with project teams.