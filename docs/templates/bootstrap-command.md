---
description: Bootstrap TemporalBridge architecture documentation for new projects
model: claude-3-5-sonnet-20241022
allowed-tools: mcp__temporal-bridge__search_graph_nodes, mcp__temporal-bridge__search_graph_edges, mcp__temporal-bridge__search_with_filters, mcp__temporal-bridge__find_component_docs, mcp__temporal-bridge__ingest_documentation
argument-hint: [project-type]
---

# TemporalBridge Architecture Bootstrap

I'll initialize complete architecture documentation for this project by analyzing the entire codebase and generating comprehensive C4 architecture documents, ADRs, and bootstrapping the knowledge graph.

## Project Analysis

**Project Type**: $ARGUMENTS

Let me start by analyzing the project structure and technology stack:

1. **Technology Stack Discovery**
   - Analyzing package managers and dependencies
   - Detecting frameworks and libraries
   - Identifying configuration files and patterns

2. **Architectural Pattern Recognition**
   - Discovering services, components, and modules
   - Mapping database and storage patterns
   - Identifying API endpoints and communication patterns

3. **Component Relationship Mapping**
   - Analyzing import dependencies
   - Discovering cross-service communication
   - Building component interaction model

## Documentation Generation

I'll create comprehensive documentation following TemporalBridge entity schema requirements:

### **Entity Schema Compliance**

**Architecture Entities:**
```yaml
---
entity_type: Architecture
component_type: service | database | api | library | frontend | backend | infrastructure
c4_layer: context | container | component | code
status: active | deprecated | planned | experimental | legacy
---
```

**ADR Entities:**
```yaml
---
entity_type: ArchitectureDecision
decision_title: "Brief description of decision"
status: proposed | accepted | deprecated | superseded
decision_date: "YYYY-MM-DD" 
impact_scope: system-wide | service-specific | data-layer | ui-layer | integration
alternatives_considered: "List of alternatives evaluated"
---
```

**DataModel Entities:**
```yaml
---
entity_type: DataModel
model_type: entity | aggregate | dto | event | schema | interface
storage_layer: postgres | redis | zep | memory | file | api
schema_format: typescript | json-schema | sql | graphql | protobuf
---
```

**Key Guidelines:**
- **component_type**: `service` (APIs, microservices), `database` (data stores), `frontend` (UIs), `backend` (servers), `infrastructure` (deployment)
- **c4_layer**: Maps to C4 levels - `context` (L1), `container` (L2), `component` (L3), `code` (L4)

### **Documentation Structure**
- `docs/architecture/` - C4 Level 1-4 architecture documents
- `docs/adr/` - Architecture Decision Records for technology choices
- Proper YAML frontmatter for Zep knowledge graph ingestion
- Mermaid diagrams for visual architecture representation

## Knowledge Graph Bootstrap

Finally, I'll bootstrap the TemporalBridge knowledge graph:

1. **Ingest Documentation** - Add all generated docs using `ingest_documentation`
2. **Create Project Entities** - Establish technology relationships and confidence scores
3. **Validate Searchability** - Ensure architectural entities are queryable
4. **Verify Completeness** - Check that all major components are documented

## Success Criteria

- [ ] `docs/architecture/` created with C4 level documents
- [ ] `docs/adr/` created with technology decision records  
- [ ] All documentation has valid YAML frontmatter
- [ ] Knowledge graph successfully ingested all documentation
- [ ] Architecture search queries return relevant results
- [ ] Major services/components comprehensively documented

Let me begin the analysis and bootstrap process...