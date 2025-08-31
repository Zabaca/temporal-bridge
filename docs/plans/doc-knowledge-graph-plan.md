# Documentation Knowledge Graph Plan

## Objective
Implement a Zep-based knowledge graph system for project documentation, focusing on Architecture Changes and Data Models as an MVP, enabling fast information retrieval and automated documentation maintenance detection.

## Context
- **Created**: August 31, 2025
- **Status**: [ ] Not Started / [x] In Progress / [ ] Completed
- **Complexity**: Medium-High
- **Scope**: MVP focusing on Architecture & Data Models

## Prerequisites
- [x] Zep Cloud API access configured
- [x] TemporalBridge MCP tools operational
- [x] Project group graph established (project-zabaca-temporal-bridge)
- [x] Understanding of Zep's custom entity type system
- [x] TypeScript entityFields API knowledge

## Relevant Resources
### Existing Documentation
- `docs/architecture/c4-level1-context.md` - System context
- `docs/architecture/c4-level2-container.md` - Container architecture  
- `docs/architecture/c4-level3-component.md` - Component details
- `docs/architecture/c4-level4-code.md` - Code structure
- `docs/feature-requests/zep-project-graph-context-block.md`
- `docs/context-block-usage.md`

### Files to Create/Modify
- [x] `apps/temporal-bridge-cli/src/lib/doc-ontology.ts` - Entity type definitions (completed)
- [ ] `apps/temporal-bridge-cli/src/lib/doc-ontology.service.ts` - Ontology management
- `apps/temporal-bridge-cli/src/lib/doc-entities.service.ts` - Documentation entity CRUD
- `apps/temporal-bridge-cli/src/test/doc-graph.e2e.test.ts` - E2E tests
- `apps/temporal-bridge-cli/src/mcp/doc-tools.service.ts` - MCP documentation tools

### Zep Documentation
- Custom entity types API - https://help.getzep.com/entity-types
- setOntology() method usage - Zep Cloud TypeScript SDK
- Graph search with entity labels - Zep API reference
- Entity relationship patterns - Zep knowledge graph docs

### Internal Documentation  
- `docs/context-block-usage.md` - How Zep structures entity context
- `docs/feature-requests/zep-project-graph-context-block.md` - Group graph limitations
- `apps/temporal-bridge-cli/src/lib/zep-client.ts` - Zep service implementation
- `apps/temporal-bridge-cli/src/mcp/temporal-bridge-tools.service.ts` - Existing graph operations

## Goals

### Parent Goal 1: Define Custom Ontology for Documentation
- [x] Sub-goal 1.1: Create TypeScript entity type definitions for Architecture, DataModel, and ADR
- [x] Sub-goal 1.2: Define edge types for Implements, Supersedes, and Affects relationships
- [ ] Sub-goal 1.3: Implement ontology service to set custom types on project graph
- [ ] Sub-goal 1.4: Write unit tests for ontology validation (10 entity/edge limit)

### Parent Goal 2: Build Documentation Entity Management System
- [ ] Sub-goal 2.1: Create service for converting markdown docs to Documentation entities
- [ ] Sub-goal 2.2: Implement Architecture entity creation from C4 diagrams
- [ ] Sub-goal 2.3: Build DataModel entity extraction from TypeScript interfaces
- [ ] Sub-goal 2.4: Develop ADR entity management with status tracking
- [ ] Sub-goal 2.5: Create relationship builder for automatic edge creation

### Parent Goal 3: Migrate Existing Documentation
- [ ] Sub-goal 3.1: Convert C4 architecture docs to Architecture entities
- [ ] Sub-goal 3.2: Extract data models from existing TypeScript code
- [ ] Sub-goal 3.3: Create initial ADRs for major architectural decisions
- [ ] Sub-goal 3.4: Establish relationships between components and documentation
- [ ] Sub-goal 3.5: Validate entity classification (no generic "Entity" labels)

### Parent Goal 4: Implement Query Patterns
- [ ] Sub-goal 4.1: Create query for finding all docs for a component
- [ ] Sub-goal 4.2: Build query to identify undocumented components
- [ ] Sub-goal 4.3: Implement ADR supersession chain traversal
- [ ] Sub-goal 4.4: Develop change impact analysis queries
- [ ] Sub-goal 4.5: Create documentation freshness check queries

### Parent Goal 5: Add MCP Tool Integration
- [ ] Sub-goal 5.1: Create `create_architecture_doc` MCP tool
- [ ] Sub-goal 5.2: Implement `update_data_model` MCP tool
- [ ] Sub-goal 5.3: Build `check_doc_status` tool for maintenance detection
- [ ] Sub-goal 5.4: Add `get_doc_graph` visualization tool
- [ ] Sub-goal 5.5: Create `suggest_doc_updates` based on code changes

### Parent Goal 6: Create E2E Test Suite
- [ ] Sub-goal 6.1: Test entity creation with proper type classification
- [ ] Sub-goal 6.2: Validate relationship creation and traversal
- [ ] Sub-goal 6.3: Test documentation discovery patterns
- [ ] Sub-goal 6.4: Verify change detection and update suggestions
- [ ] Sub-goal 6.5: Test query performance with realistic data volume

## Implementation Notes

### Entity Type Design Principles
- Keep entity types focused and minimal (3-5 for MVP)
- Use descriptive field names that guide LLM extraction
- Leverage default edge types where possible
- Ensure entity descriptions are clear for classification

### Ontology Structure (TypeScript)
```typescript
import { entityFields, EntityType, EdgeType } from "@getzep/zep-cloud/wrapper/ontology";

const ArchitectureSchema: EntityType = {
  description: "Architectural component or system design element",
  fields: {
    type: entityFields.text("Component type: service, database, api, library"),
    layer: entityFields.text("C4 layer: context, container, component, code"),
    status: entityFields.text("Status: active, deprecated, planned")
  }
};
```

### Graph Structure
- User graph: Personal development notes and explorations
- Project graph: Shared architecture and data model documentation
- Relationships: Cross-reference between components and docs

## Testing Strategy
- [ ] Unit Tests: Ontology validation, entity creation
- [ ] Integration Tests: Graph operations, relationship traversal
- [ ] E2E Tests: Full documentation workflow scenarios
- [ ] Performance Tests: Query speed with 100+ entities
- [ ] Classification Tests: Verify no generic "Entity" labels

## Risks & Mitigations
- [ ] **Risk**: Generic entity classification persists
  - **Mitigation**: Thorough entity descriptions and testing
   
- [ ] **Risk**: Ontology changes don't affect existing entities
  - **Mitigation**: Plan for migration strategy or accept limitation
   
- [ ] **Risk**: Query performance degrades with scale
  - **Mitigation**: Start with focused MVP, optimize queries early

- [ ] **Risk**: Documentation becomes stale
  - **Mitigation**: Automated detection via commit hooks

## Timeline Estimate
- [x] Planning & Research: 2 hours (completed)
- [x] Ontology Definition: 3 hours (completed - created doc-ontology.ts)
- [ ] Entity Management: 6 hours
- [ ] Migration: 4 hours
- [ ] Query Implementation: 4 hours
- [ ] MCP Tools: 3 hours
- [ ] Testing: 4 hours
- **Total**: ~26 hours

## Success Criteria
- [ ] All architecture docs properly classified (not "Entity")
- [ ] Can find any component's documentation in <2 seconds
- [ ] Automated detection of documentation gaps
- [ ] ADR history trackable through time
- [ ] Change impact analysis functional

## Discussion & Decisions

### Why Architecture & Data Models First?
- High impact on development workflow
- Changes less frequently but has cascading effects
- Natural fit for graph relationships
- Clear value proposition for team

### Expansion Path
- [ ] **MVP**: Architecture + Data Models + ADRs
- [ ] **v2**: + API Documentation (extends from data models)
- [ ] **v3**: + Requirements tracking
- [ ] **v4**: Full documentation coverage

### Key Design Decisions
- [ ] Focus on project graph for shared documentation
- [ ] Use minimal custom entity types (3-5 max)
- [ ] Leverage Zep's temporal features for versioning
- [ ] Prioritize query performance over completeness

## Next Steps
- [x] Review and approve this plan
- [x] Create docs/plans directory if it doesn't exist
- [x] Begin with Parent Goal 1: Define Custom Ontology (in progress - 2/4 sub-goals completed)
- [ ] Set up development branch for implementation
- [ ] Schedule progress checkpoints