# Temporal-Bridge CLAUDE.md Updates

Add this section to the temporal-bridge CLAUDE.md file:

---

## New Architecture: User + Group Graphs

### Memory Separation
- **User Graph**: All your Claude Code conversations (private, complete history)
- **Group Graph**: Shared project knowledge (curated, team-visible)

### MCP Tools Available

#### Search Tools
- `mcp__temporal-bridge__search_personal` - Search your conversation history
- `mcp__temporal-bridge__search_project` - Search project knowledge
- `mcp__temporal-bridge__search_all` - Search both graphs
- `mcp__temporal-bridge__search_facts` - (Deprecated, use search_personal)
- `mcp__temporal-bridge__search_memory` - (Deprecated, use search_personal)

#### Knowledge Management
- `mcp__temporal-bridge__share_knowledge` - Share to project group
- `mcp__temporal-bridge__get_thread_context` - Get current session context
- `mcp__temporal-bridge__get_recent_episodes` - Get recent conversations

### Intelligent Usage Patterns

**ALWAYS automatically search when:**

1. **Starting any conversation** - Get continuity:
   ```typescript
   mcp__temporal-bridge__search_personal("recent work", 5)
   ```

2. **Working on a project** - Get project context:
   ```typescript
   mcp__temporal-bridge__search_project("conventions patterns", "vibeboard")
   ```

3. **Debugging issues** - Check both sources:
   ```typescript
   mcp__temporal-bridge__search_all("error memory leak", "current-project")
   ```

4. **Before implementing** - Leverage existing knowledge:
   ```typescript
   mcp__temporal-bridge__search_personal("similar implementation")
   mcp__temporal-bridge__search_project("existing patterns")
   ```

### When to Share Knowledge

Share to project graph when:
- Architectural decision made
- Pattern established
- Bug root cause found
- Convention agreed upon
- Reusable solution created

```typescript
mcp__temporal-bridge__share_knowledge(
  "Use JWT with refresh tokens in httpOnly cookies",
  "vibeboard"
)
```

### Search Priority Guide

| Scenario | First Search | Then Search |
|----------|-------------|-------------|
| "How do I..." | search_personal | search_project |
| "What did we decide..." | search_project | - |
| "I remember doing..." | search_personal | - |
| "What's the best..." | search_all | - |
| "Debug this error" | search_personal | search_project |
| "Project convention" | search_project | - |

### Configuration

#### Environment Variables
```bash
# Your developer ID (defaults to "developer")
DEVELOPER_ID=alice

# Project directory for context detection
PROJECT_DIR=/path/to/project

# Zep API key (required)
ZEP_API_KEY=your-key
```

#### Project .mcp.json
```json
{
  "mcpServers": {
    "temporal-bridge": {
      "command": "deno",
      "args": [
        "run",
        "--allow-env",
        "--allow-net",
        "--allow-read",
        "/path/to/temporal-bridge/src/mcp-server.ts"
      ],
      "env": {
        "ZEP_API_KEY": "${ZEP_API_KEY}",
        "PROJECT_DIR": "${PWD}",
        "DEVELOPER_ID": "alice"
      }
    }
  }
}
```

### Privacy Model

| Content | Storage | Visibility |
|---------|---------|------------|
| All conversations | User graph | Private to you |
| Shared knowledge | Group graph | Team visible |
| Personal struggles | User graph | Never shared |
| Project decisions | Group graph | Always shared |
| Debug sessions | User graph | Private unless shared |

### Migration from Old System

If you have existing project-scoped user IDs:
1. They'll continue to work (backward compatible)
2. New conversations use simple user ID
3. Run migration tool to consolidate (optional)

```bash
deno task migrate-to-user-graph
```

---