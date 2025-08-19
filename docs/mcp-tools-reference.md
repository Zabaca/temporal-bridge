# TemporalBridge MCP Tools Reference

## Overview

TemporalBridge provides 6 MCP tools for memory search, knowledge sharing, and context retrieval. These tools implement the **User Graph Architecture** where personal conversations are stored in your user graph, and shared knowledge is manually curated into project groups.

## Search Tools

### `search_personal`
Search your personal conversation history and learnings only.

**Purpose**: Find your own experiences, preferences, and past solutions.

**Parameters**:
- `query` (required): Search query for personal memories
- `scope` (optional): "edges", "nodes", or "episodes" (default: "episodes")  
- `limit` (optional): Number of results (default: 5)
- `reranker` (optional): "cross_encoder" or "none" (default: "cross_encoder")

**Usage Patterns**:
```typescript
// Find your debugging approaches
search_personal({
  query: "debugging approaches that worked",
  scope: "episodes",
  limit: 5
})

// Search your coding preferences  
search_personal({
  query: "TypeScript preferences",
  scope: "edges",
  limit: 3
})
```

**Example Response**:
```json
{
  "source": "personal",
  "results": [
    {
      "content": "I prefer using console.log with clear labels for debugging React components",
      "score": 0.92,
      "type": "episode",
      "metadata": {
        "scope": "personal",
        "uuid": "episode-123",
        "session_id": "session-456"
      }
    }
  ]
}
```

### `search_project`
Search shared project knowledge and team decisions only.

**Purpose**: Find team conventions, architectural decisions, and shared best practices.

**Parameters**:
- `query` (required): Search query for project knowledge
- `project` (optional): Project name (defaults to current project)
- `scope` (optional): "edges", "nodes", or "episodes" (default: "edges")
- `limit` (optional): Number of results (default: 5)
- `reranker` (optional): "cross_encoder" or "none" (default: "cross_encoder")

**Usage Patterns**:
```typescript
// Find team architecture decisions
search_project({
  query: "database architecture decisions",
  scope: "edges",
  limit: 5
})

// Search specific project
search_project({
  query: "authentication patterns",
  project: "my-other-project",
  scope: "episodes"
})
```

**Example Response**:
```json
{
  "source": "project",
  "project": "temporal-bridge",
  "groupId": "project-zabaca-temporal-bridge",
  "results": [
    {
      "content": "Team decided to use PostgreSQL with Prisma for type-safe database queries",
      "score": 0.89,
      "type": "edge",
      "metadata": {
        "scope": "group_edges",
        "sharedBy": "developer",
        "timestamp": "2025-01-20T10:30:00Z"
      }
    }
  ]
}
```

### `search_all`
Search both personal and project memories with source labels.

**Purpose**: Get comprehensive context from both your experience and team knowledge.

**Parameters**:
- `query` (required): Search query for all memories
- `project` (optional): Project name for group graph (defaults to current)
- `limit` (optional): Number of results per source (default: 5)
- `reranker` (optional): "cross_encoder" or "none" (default: "cross_encoder")

**Usage Patterns**:
```typescript
// Comprehensive React knowledge
search_all({
  query: "React component patterns",
  limit: 5
})

// Error handling across all sources
search_all({
  query: "error handling approaches",
  limit: 3
})
```

**Example Response**:
```json
{
  "query": "React patterns",
  "project": "temporal-bridge",
  "personal": [
    {
      "content": "I like using custom hooks for data fetching logic",
      "score": 0.91,
      "type": "episode"
    }
  ],
  "project_results": [
    {
      "content": "Team standard: Use React.memo for expensive re-renders",
      "score": 0.87,
      "type": "edge"
    }
  ]
}
```

## Knowledge Sharing

### `share_knowledge`
Share knowledge from personal conversations to project groups.

**Purpose**: Curate valuable insights, decisions, and patterns for team collaboration.

**Parameters**:
- `message` (required): The knowledge to share (max 10,000 characters)
- `project` (optional): Target project name (defaults to current project)

**Usage Patterns**:
```typescript
// Share architecture decision
share_knowledge({
  message: "We decided to use JWT tokens with httpOnly cookies for authentication to prevent XSS attacks"
})

// Share to specific project
share_knowledge({
  message: "Performance optimization: Lazy load routes reduced bundle size by 40%",
  project: "my-other-project"
})
```

**Example Response**:
```json
{
  "success": true,
  "message": "✅ Knowledge shared to project: temporal-bridge\n📝 Message: \"We decided to use JWT tokens with httpOnly cookies...\"\n🔗 Group ID: project-zabaca-temporal-bridge\n👤 Shared by: developer",
  "groupId": "project-zabaca-temporal-bridge"
}
```

**What to Share**:
- ✅ Architecture decisions and rationale
- ✅ Bug fixes and root causes  
- ✅ Performance optimizations
- ✅ Team conventions and standards
- ✅ Reusable patterns and solutions

**What NOT to Share**:
- ❌ Personal debugging struggles
- ❌ Incomplete or speculative thoughts
- ❌ Sensitive information (API keys, passwords)
- ❌ Non-actionable complaints

## Context & History Tools

### `get_thread_context`
Get comprehensive context for a specific conversation thread.

**Purpose**: Understand the full context of a particular conversation or session.

**Parameters**:
- `thread_id` (required): Claude Code thread ID (format: "claude-code-session-id")
- `min_rating` (optional): Minimum fact confidence rating 0-1

**Usage Patterns**:
```typescript
// Get specific thread context
get_thread_context({
  thread_id: "claude-code-abc123def456",
  min_rating: 0.7
})
```

**Example Response**:
```json
{
  "context_summary": "Thread focused on implementing React authentication flow with discussion of JWT tokens and security considerations",
  "facts": [
    {
      "fact": "developer PREFERS JWT authentication",
      "score": 0.89,
      "created_at": "2025-01-20T10:30:00Z"
    }
  ],
  "thread_id": "claude-code-abc123def456",
  "user_id": "developer"
}
```

### `get_recent_episodes`
Get recent conversation episodes for context building.

**Purpose**: Maintain continuity across conversations and sessions.

**Parameters**:
- `limit` (optional): Number of recent episodes (default: 10)

**Usage Patterns**:
```typescript
// Get recent context
get_recent_episodes({
  limit: 5
})
```

**Example Response**:
```json
[
  {
    "content": "Discussion about React component optimization",
    "score": 1.0,
    "type": "episode",
    "created_at": "2025-01-20T15:30:00Z",
    "metadata": {
      "session_id": "session-123",
      "processed": true
    }
  }
]
```

### `get_current_context`
Get memory context for the current Claude Code session.

**Purpose**: Automatically retrieve context for the active conversation.

**Parameters**: None

**Usage Patterns**:
```typescript
// Get current session context
get_current_context()
```

**Example Response**:
```json
{
  "context_summary": "Current session discussing TemporalBridge architecture implementation",
  "facts": [],
  "thread_id": "claude-code-current-session",
  "user_id": "developer"
}
```

## Usage Patterns by Scenario

### Starting a New Feature
1. `search_project` - Check existing team decisions
2. `search_personal` - Reference your past similar implementations  
3. `search_all` - Get comprehensive context if needed

### Debugging Issues
1. `search_personal` - Find your past solutions to similar problems
2. `search_project` - Check team debugging approaches
3. `get_recent_episodes` - Review recent context

### Making Decisions
1. `search_project` - Check existing team standards
2. `search_personal` - Review your experience and preferences
3. `share_knowledge` - Document the final decision

### Code Review
1. `search_project` - Verify adherence to team conventions
2. `search_all` - Get full context on patterns used

### Onboarding New Team Members
1. `search_project` - Show them team decisions and conventions
2. Share accumulated knowledge via project documentation

## Response Format Standards

All search tools return results with:
- **content**: The actual knowledge or conversation content
- **score**: Relevance score (0-1, higher is more relevant)
- **type**: "edge", "node", or "episode"
- **created_at**: ISO timestamp when stored
- **metadata**: Additional context (scope, IDs, attribution)

## Error Handling

**Common Error Responses**:
```json
{
  "error": "No project context available. Make sure you're in a project directory."
}
```

**Graceful Fallbacks**:
- `search_project` falls back to helpful error if no project context
- `search_all` falls back to personal-only search if no project available
- All tools handle missing or invalid parameters gracefully

## Performance Considerations

- **Default limits**: All tools use sensible defaults (5-10 results)
- **Cross encoder reranking**: Enabled by default for better relevance
- **Caching**: Project context is cached for performance
- **Timeouts**: Tools handle API timeouts gracefully

## Best Practices

1. **Search before implementing** - Always check existing knowledge
2. **Use specific scopes** - Choose "edges" for facts, "episodes" for context
3. **Share deliberately** - Quality over quantity for project knowledge
4. **Start specific, expand scope** - Try personal or project first, then search_all
5. **Maintain context** - Use get_recent_episodes for conversation continuity

## Integration with Claude Code

These tools are automatically available in any Claude Code session with TemporalBridge configured. Claude can call them directly during conversations to provide memory-enhanced assistance.

Example conversation:
```
👤: "How should I handle user authentication?"

🤖: Let me search for authentication patterns...
    [Calls search_all("user authentication patterns")]
    
    Based on your past experience and team decisions:
    
    Personal: You've successfully used JWT tokens before
    Project: The team has standardized on httpOnly cookies for security
    
    I recommend following the team standard with httpOnly cookies.
```

## Troubleshooting

**Tool not available**: Check `.mcp.json` configuration and ensure TemporalBridge is running
**No results**: Try broader search terms or different scopes
**Permission errors**: Verify ZEP_API_KEY is set correctly
**Project context missing**: Ensure you're in a project directory with git or package.json