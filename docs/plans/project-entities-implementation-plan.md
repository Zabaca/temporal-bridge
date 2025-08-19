# Project Entities Implementation Plan

## Objective
Implement Project as a special entity type in TemporalBridge to enable rich semantic relationships, cross-project knowledge analysis, and better understanding of technology usage patterns across different projects.

## Context
- **Created**: 2025-01-20
- **Status**: [ ] Not Started / [ ] In Progress / [ ] Completed
- **Complexity**: Medium

### Current Architecture
- Conversations stored in user graph with limited project context
- Project detection exists but only used for debug logging
- No semantic understanding of projects, technologies, or relationships
- Limited cross-project analysis capabilities

### Target Architecture
- Project entities with rich metadata (name, organization, technologies, etc.)
- Semantic relationships: WORKS_ON, USES, BELONGS_TO
- Automatic technology detection and relationship creation
- Enhanced search capabilities with project context
- Cross-project pattern analysis

## Prerequisites
- [x] User Graph Architecture completed
- [x] Project detection system functional (`project-detector.ts`)
- [x] MCP tools and search functionality working
- [ ] Understanding of Zep entity types and relationship storage

## Relevant Resources

### Guides
- Current `docs/architecture/project-segregation-options.md`
- Zep documentation on entity types and relationships
- Existing project detection implementation in `src/lib/project-detector.ts`

### Files to Modify
- `src/lib/project-detector.ts` - Add technology detection
- `src/hooks/store_conversation.ts` - Add project entity creation
- `src/lib/memory-tools.ts` - Add project-aware search functions
- `src/lib/types.ts` - Add Project entity type definitions
- `src/lib/zep-client.ts` - Add entity management utilities

### Documentation
- [Zep Entity Types](https://help.getzep.com/graph#entities)
- [Zep Relationships](https://help.getzep.com/graph#relationships)
- [Zep Graph API Reference](https://help.getzep.com/sdk#graph-operations)

## Goals

### Parent Goal 1: Define Project Entity Schema
- [ ] Sub-goal 1.1: Define Project entity type interface in types.ts
- [ ] Sub-goal 1.2: Create ProjectEntityProperties type with all metadata fields
- [ ] Sub-goal 1.3: Define standard relationship types (WORKS_ON, USES, BELONGS_TO)
- [ ] Sub-goal 1.4: Add TypeScript interfaces for technology detection

### Parent Goal 2: Implement Technology Detection
- [ ] Sub-goal 2.1: Create technology detection from package.json dependencies
- [ ] Sub-goal 2.2: Add technology detection from deno.json configuration
- [ ] Sub-goal 2.3: Implement file extension analysis (.ts, .jsx, .py, etc.)
- [ ] Sub-goal 2.4: Add framework detection (React, Vue, Express, etc.)
- [ ] Sub-goal 2.5: Implement database detection (PostgreSQL, MongoDB, SQLite)
- [ ] Sub-goal 2.6: Add containerization detection (Docker, Docker Compose)
- [ ] Sub-goal 2.7: Create confidence scoring for detected technologies

### Parent Goal 3: Implement Project Entity Management
- [ ] Sub-goal 3.1: Create `ensureProjectEntity()` function with upsert logic
- [ ] Sub-goal 3.2: Implement project metadata collection and storage
- [ ] Sub-goal 3.3: Add technology relationship creation (`project USES technology`)
- [ ] Sub-goal 3.4: Implement developer relationship creation (`developer WORKS_ON project`)
- [ ] Sub-goal 3.5: Add organization relationship creation (`project BELONGS_TO organization`)
- [ ] Sub-goal 3.6: Handle entity deduplication and updates

### Parent Goal 4: Integrate with Conversation Storage
- [ ] Sub-goal 4.1: Modify storage hook to call ensureProjectEntity
- [ ] Sub-goal 4.2: Add project context to conversation facts
- [ ] Sub-goal 4.3: Create session-project relationships (`session OCCURS_IN project`)
- [ ] Sub-goal 4.4: Update debug logging to show entity creation
- [ ] Sub-goal 4.5: Add error handling for entity creation failures

### Parent Goal 5: Enhance Search Capabilities
- [ ] Sub-goal 5.1: Add project filtering to `search_personal` tool
- [ ] Sub-goal 5.2: Create project portfolio query functions
- [ ] Sub-goal 5.3: Implement technology expertise search
- [ ] Sub-goal 5.4: Add cross-project pattern analysis functions
- [ ] Sub-goal 5.5: Create project-specific conversation search

### Parent Goal 6: Add Project Management Tools
- [ ] Sub-goal 6.1: Create `list_projects` MCP tool
- [ ] Sub-goal 6.2: Implement `project_technologies` MCP tool  
- [ ] Sub-goal 6.3: Add `project_context` tool for current project info
- [ ] Sub-goal 6.4: Create project relationship visualization queries
- [ ] Sub-goal 6.5: Add project statistics and analytics functions

### Parent Goal 7: Testing and Validation
- [ ] Sub-goal 7.1: Test project entity creation across different project types
- [ ] Sub-goal 7.2: Validate technology detection accuracy
- [ ] Sub-goal 7.3: Test relationship creation and storage
- [ ] Sub-goal 7.4: Verify search enhancements work correctly
- [ ] Sub-goal 7.5: Test entity deduplication and updates

### Parent Goal 8: Documentation and Examples
- [ ] Sub-goal 8.1: Document Project entity schema and relationships
- [ ] Sub-goal 8.2: Create examples of project-aware search queries
- [ ] Sub-goal 8.3: Add project entity usage patterns to CLAUDE.md
- [ ] Sub-goal 8.4: Create troubleshooting guide for entity creation
- [ ] Sub-goal 8.5: Update MCP tools reference with new project tools

## Implementation Notes

### Project Entity Schema
```typescript
interface ProjectEntity {
  type: "Project";
  name: string;  // projectId (e.g., "zabaca-temporal-bridge")
  properties: {
    displayName: string;       // Human-readable name
    organization?: string;     // Organization/namespace
    repository?: string;       // Git remote URL
    projectType: string;       // 'git' | 'directory'
    technologies: string[];    // Detected tech stack
    path: string;             // Local filesystem path
    created: string;          // ISO timestamp
    lastUpdated: string;      // ISO timestamp
    confidence: Record<string, number>; // Tech confidence scores
  };
}
```

### Technology Detection Strategy
- **High Confidence (>0.9)**: Direct dependency declarations, config files
- **Medium Confidence (0.6-0.9)**: File extensions, directory structure
- **Low Confidence (0.3-0.6)**: Patterns in code, naming conventions
- **Minimum Threshold**: 0.6 for automatic relationship creation

### Relationship Patterns
```typescript
// Core relationships
"developer WORKS_ON project-temporal-bridge"
"project-temporal-bridge USES Deno"
"project-temporal-bridge USES TypeScript"
"project-temporal-bridge BELONGS_TO zabaca"

// Session relationships  
"session-abc123 OCCURS_IN project-temporal-bridge"
"developer DISCUSSED 'authentication' IN project-temporal-bridge"
```

### Entity Deduplication Strategy
- Use `projectId` as unique identifier
- Update existing entities with new technology discoveries
- Merge relationship sets (don't duplicate relationships)
- Handle technology confidence score updates

## Testing Strategy

### Technology Detection Tests
- [ ] Test package.json parsing for various dependency types
- [ ] Validate deno.json configuration detection
- [ ] Test file extension analysis accuracy
- [ ] Verify framework detection logic
- [ ] Test confidence scoring calculations

### Entity Management Tests
- [ ] Test project entity creation and updates
- [ ] Validate relationship creation without duplicates
- [ ] Test entity deduplication logic
- [ ] Verify error handling for malformed projects

### Integration Tests
- [ ] Test hook integration with entity creation
- [ ] Validate search enhancements with real project data
- [ ] Test cross-project queries and relationships
- [ ] Verify MCP tool functionality

### Performance Tests
- [ ] Measure entity creation time impact on hook
- [ ] Test search performance with project entities
- [ ] Validate memory usage with large project portfolios

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Technology detection false positives | Use confidence thresholds and validation |
| Entity creation performance impact | Batch operations and error handling |
| Relationship duplication | Implement proper deduplication logic |
| Project detection edge cases | Comprehensive testing with various project structures |
| Zep API rate limiting | Add retry logic and error handling |

## Timeline Estimate
- Planning and schema design: 2-3 hours ✓
- Technology detection implementation: 6-8 hours
- Entity management and integration: 4-6 hours  
- Search enhancements: 3-4 hours
- MCP tools and documentation: 3-4 hours
- Testing and validation: 4-6 hours
- **Total**: 22-31 hours

## Discussion

### Design Decisions
1. **Entity Uniqueness**: Use `projectId` as the unique identifier for Project entities
2. **Technology Confidence**: Only create relationships for technologies with >0.6 confidence
3. **Update Strategy**: Update existing project entities when new technologies detected
4. **Integration Point**: Hook integration ensures automatic entity creation per conversation

### Key Questions Resolved
1. **Technology Detection Scope**: Expansive detection with high confidence requirements ✓
2. **Project Changes**: Handled automatically when switching project directories ✓
3. **Relationship Types**: Focus on WORKS_ON, USES, BELONGS_TO relationships ✓
4. **Migration Strategy**: No migration needed, build naturally through conversations ✓
5. **Entity Deduplication**: Rely on Zep's built-in deduplication with upsert pattern ✓

### Implementation Priorities
1. **Phase 1**: Entity schema and basic technology detection
2. **Phase 2**: Hook integration and relationship creation  
3. **Phase 3**: Search enhancements and MCP tools
4. **Phase 4**: Advanced analytics and visualization

## Success Criteria
- [x] Project entities created automatically for each project
- [x] Technology stack accurately detected and stored as relationships
- [x] Enhanced search capabilities with project context
- [x] Cross-project analysis and pattern recognition
- [x] New MCP tools for project management and exploration
- [x] Comprehensive documentation and examples

## Next Steps
1. Review and approve implementation plan
2. Set up development environment for testing
3. Begin with Parent Goal 1: Define Project Entity Schema
4. Implement technology detection with confidence scoring
5. Integrate with existing conversation storage hook
6. Test with multiple project types and validate accuracy

---

**Note**: This implementation will transform TemporalBridge from conversation storage into an intelligent project portfolio and technology expertise tracking system.