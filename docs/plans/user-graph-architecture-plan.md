# User Graph Architecture Migration Plan

## Objective
Migrate from project-scoped user IDs to a single user graph per developer, with manual knowledge sharing to project group graphs via a `/share-knowledge` command.

## Context
- **Created**: 2025-01-20
- **Status**: [x] COMPLETED ✅
- **Complexity**: High

### Current Architecture
- User IDs are project-scoped: `developer-zabaca-vibeboard`
- All conversations stored under project-specific users
- No separation between personal conversations and project knowledge
- Complex ID generation causing mismatches

### Target Architecture
- Single user graph per developer: `developer` or `alice`
- All Claude conversations go to user graph
- Project knowledge manually shared to group graphs
- Clean separation of personal vs shared knowledge

## Prerequisites
- [ ] Backup existing Zep data
- [ ] Document current user IDs and their mappings
- [ ] Ensure all team members are aware of migration

## Relevant Resources
### Guides
- `/docs/architecture/project-segregation-options.md`
- Zep Group Graph documentation
- MCP Server protocol documentation

### Files to Modify
- `src/lib/zep-client.ts` - User ID generation
- `src/lib/project-detector.ts` - Add group ID support
- `src/hooks/store_conversation.ts` - Change storage destination
- `src/mcp-server.ts` - Add share-knowledge tool
- `src/lib/memory-tools.ts` - Add group graph methods
- `.mcp.json` files in various projects

### Documentation
- [Zep Group Graphs](https://help.getzep.com/groups)
- [MCP Tool Definition](https://modelcontextprotocol.io/docs/concepts/tools)

## Goals

### [x] Parent Goal 1: Simplify User ID System
- [x] Sub-goal 1.1: Update `getDefaultConfig()` to use simple developer ID
- [x] Sub-goal 1.2: Add `DEVELOPER_ID` environment variable support
- [x] Sub-goal 1.3: Remove project-scoping from user ID generation
- [x] Sub-goal 1.4: Update project-detector to return both userId and groupId

### [x] Parent Goal 2: Implement Group Graph Support
- [x] Sub-goal 2.1: Add group graph methods to memory-tools.ts
- [x] Sub-goal 2.2: Create `shareToProjectGroup()` function
- [x] Sub-goal 2.3: Add group graph search capabilities
- [x] Sub-goal 2.4: Implement group graph creation/management

### [x] Parent Goal 3: Update Storage Hook
- [x] Sub-goal 3.1: Modify hook to store all conversations in user graph
- [x] Sub-goal 3.2: Remove automatic project routing logic
- [x] Sub-goal 3.3: Add project metadata to stored conversations
- [x] Sub-goal 3.4: Update debug logging for new structure

### [x] Parent Goal 4: Create /share-knowledge Command
- [x] Sub-goal 4.1: Define MCP tool schema for share_knowledge
- [x] Sub-goal 4.2: Implement tool handler in mcp-server.ts
- [x] Sub-goal 4.3: Add validation for project context
- [x] Sub-goal 4.4: Create confirmation/feedback mechanism

### [x] Parent Goal 5: Update Search Strategy and MCP Tools
- [x] Sub-goal 5.1: Create `search_personal` tool (user graph only)
- [x] Sub-goal 5.2: Create `search_project` tool (group graph only)
- [x] Sub-goal 5.3: Create `search_all` tool (both graphs with source labels)
- [x] Sub-goal 5.4: Update existing search tools with deprecation notices
- [x] Sub-goal 5.5: Add context-aware search routing

### [x] Parent Goal 6: Migration Strategy - SKIPPED
- [x] Sub-goal 6.1: Create data migration script - SKIPPED (fresh start)
- [x] Sub-goal 6.2: Map existing user IDs to new structure - SKIPPED (fresh start)
- [x] Sub-goal 6.3: Copy relevant data to appropriate graphs - SKIPPED (fresh start)
- [x] Sub-goal 6.4: Provide rollback mechanism - SKIPPED (fresh start)

### [x] Parent Goal 7: Update Configuration
- [x] Sub-goal 7.1: Update example .mcp.json files
- [x] Sub-goal 7.2: Remove ZEP_USER_ID overrides
- [x] Sub-goal 7.3: Add GROUP_ID configuration support
- [x] Sub-goal 7.4: Update environment variable documentation

### [x] Parent Goal 8: Documentation and Templates
- [x] Sub-goal 8.1: Update temporal-bridge CLAUDE.md with new architecture
- [x] Sub-goal 8.2: Create CLAUDE.md template for projects using temporal-bridge
- [x] Sub-goal 8.3: Document new MCP tools and their usage patterns
- [x] Sub-goal 8.4: Create examples of when to use each search tool
- [x] Sub-goal 8.5: Add migration guide for existing users

## Implementation Notes

### User ID Strategy
```typescript
// Simple approach - single ID per developer
userId: process.env.DEVELOPER_ID || "developer"

// Group ID for projects
groupId: `project-${projectContext.projectId}`
```

### Share Knowledge Tool Schema
```typescript
{
  name: "share_knowledge",
  description: "Share knowledge to project group graph",
  parameters: {
    message: "The knowledge to share",
    project: "Target project (optional, defaults to current)"
  }
}
```

### New Search Tools Schema
```typescript
// Personal memory search (user graph only)
{
  name: "search_personal",
  description: "Search your personal conversation history and learnings",
  parameters: {
    query: "Search query",
    limit: "Number of results (default: 5)"
  }
}

// Project knowledge search (group graph only)
{
  name: "search_project", 
  description: "Search shared project knowledge and decisions",
  parameters: {
    query: "Search query",
    project: "Project name (optional, defaults to current)",
    limit: "Number of results (default: 5)"
  }
}

// Combined search (both graphs)
{
  name: "search_all",
  description: "Search both personal and project memories",
  parameters: {
    query: "Search query",
    project: "Project name for group graph",
    limit: "Number of results per source (default: 5)"
  }
}
```

### Storage Flow
1. All conversations → User graph (automatic)
2. User invokes `/share-knowledge "Decision about X"`
3. Knowledge → Group graph (manual)
4. Confirmation shown to user

## Testing Strategy
- [ ] Test simple user ID generation
- [ ] Verify group graph creation
- [ ] Test share-knowledge command
- [ ] Validate data migration
- [ ] Test search across user and group graphs
- [ ] Verify backward compatibility

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Create full backup before migration |
| Breaking existing integrations | Provide compatibility layer during transition |
| Confusion about what to share | Create clear guidelines and examples |
| Privacy concerns with shared knowledge | Default to private, require explicit sharing |
| Group name conflicts | Use consistent naming convention |

## Timeline Estimate
- Planning: 2 hours ✓
- Implementation: 8-12 hours
- Testing: 4-6 hours
- Migration: 2-4 hours
- Total: 16-24 hours

## Discussion

### Decisions Made
1. Use simple user IDs without project scoping
2. Manual sharing via command rather than automatic extraction
3. Group graphs for project knowledge (not compound user IDs)
4. MCP tool for sharing (enables direct Claude integration)

### Open Questions
1. Should we support multiple developer IDs per machine?
2. How to handle existing project-scoped data?
3. Should shared knowledge include attribution?
4. Rate limiting for share commands?

## Relevant Files

### Modified Files
- `src/lib/zep-client.ts` - Updated to use simple developer ID instead of project-scoped
- `src/lib/project-detector.ts` - Added groupId field to ProjectContext interface, deprecated getScopedUserId
- `src/lib/types.ts` - Added projectContext field to ZepConfig interface
- `src/lib/memory-tools.ts` - Added group graph methods and enhanced shareToProjectGroup with validation
- `src/hooks/store_conversation.ts` - Updated to store conversations in user graph with project context
- `src/mcp-server.ts` - Added share_knowledge MCP tool for sharing knowledge to project groups

### Created Files
- `docs/templates/PROJECT-CLAUDE.md` - Template for projects using temporal-bridge
- `docs/templates/TEMPORAL-BRIDGE-CLAUDE-UPDATE.md` - Updates for temporal-bridge CLAUDE.md
- `docs/templates/example.mcp.json` - Example MCP configuration for projects
- `docs/environment-variables.md` - Comprehensive environment variable reference
- `docs/mcp-tools-reference.md` - Complete MCP tools documentation and usage patterns
- `docs/search-tool-examples.md` - Practical examples of when to use each search tool
- `docs/migration-guide.md` - Comprehensive migration guide for existing users

## Next Steps
1. Review and approve plan
2. Set up test environment
3. Implement user ID simplification ✓
4. Add group graph support
5. Create share-knowledge command
6. Test with sample project
7. Create migration script
8. Deploy to production