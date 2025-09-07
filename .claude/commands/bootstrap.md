---
description: Bootstrap TemporalBridge architecture documentation for new projects
model: claude-3-5-sonnet-20241022
allowed-tools: mcp__temporal-bridge__search_graph_nodes, mcp__temporal-bridge__search_graph_edges, mcp__temporal-bridge__search_with_filters, mcp__temporal-bridge__find_component_docs, mcp__temporal-bridge__ingest_documentation
argument-hint: [project-type]
---

# TemporalBridge Architecture Bootstrap

Initialize complete architecture documentation for this project by analyzing the entire codebase and generating comprehensive C4 architecture documents, ADRs, and bootstrapping the knowledge graph.

## Primary Responsibility

**Architecture Bootstrap & Discovery**
- Analyze entire codebase structure to discover architectural patterns
- Generate initial C4 architecture documentation (Context, Container, Component, Code levels)
- Create foundational Architecture Decision Records (ADRs) based on technology choices
- Set up complete documentation folder structure and templates
- Bootstrap knowledge graph with discovered architectural entities and relationships

**First-Time Project Setup**
- Handle projects with zero existing architectural documentation
- Perform comprehensive codebase analysis (not just git diff analysis)
- Create documentation templates tailored to discovered architectural patterns
- Establish baseline for ongoing architectural change monitoring

## Bootstrap Process Workflow

### **Phase 1: Project Discovery**
```markdown
1. Analyze project structure and technology stack
2. Identify architectural patterns and component relationships
3. Discover services, databases, APIs, and external dependencies
4. Map technology choices and framework usage
5. Assess project scale and complexity
```

### **Phase 2: Documentation Generation**
```markdown
1. Create docs/architecture/ and docs/adr/ folder structures
2. Generate C4 Level 1 (System Context) diagrams and documentation
3. Generate C4 Level 2 (Container) architecture based on discovered services
4. Generate C4 Level 3 (Component) documentation for major modules
5. Generate C4 Level 4 (Code) documentation for key interfaces and classes
6. Create initial ADRs documenting major technology and architectural decisions
```

### **Phase 3: Knowledge Graph Bootstrap**
```markdown
1. Ingest all generated documentation into TemporalBridge knowledge graph using `mcp__temporal-bridge__ingest_documentation` tool
```

## Documentation Generation

Create comprehensive documentation following TemporalBridge entity schema requirements:

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
- **component_type**: `service` (APIs, microservices), `database` (data stores), `frontend` (UIs), `backend` (servers), `infrastructure` (deployment), `api` (REST/GraphQL), `library` (shared code)
- **c4_layer**: Maps to C4 levels - `context` (L1), `container` (L2), `component` (L3), `code` (L4)
- **status**: `active` (current), `deprecated` (phasing out), `planned` (designed), `experimental` (prototype), `legacy` (old)

### **Documentation Structure**
- `docs/architecture/` - C4 Level 1-4 architecture documents
- `docs/adr/` - Architecture Decision Records for technology choices
- Proper YAML frontmatter for Zep knowledge graph ingestion
- **Mermaid diagrams** - Essential for visual architecture representation
  - Data flow diagrams showing system interactions
  - Container communication patterns
  - Component relationship mappings
  - Build and runtime process flows


## Documentation Templates

### **C4 Level 1 Context Template**
```markdown
---
entity_type: Architecture
component_type: infrastructure
c4_layer: context
technology_stack: {{ detected_tech_stack }}
status: active
document_purpose: System context and external dependencies
external_systems: {{ discovered_external_systems }}
stakeholders: {{ identified_stakeholders }}
---

# {{ project_name }} System Context

## System Purpose
{{ generated_system_description }}

## Key External Systems
{{ external_system_relationships }}

## Core Value Propositions
{{ value_propositions_based_on_code_analysis }}

## System Boundaries
### **Internal Responsibilities**
{{ internal_system_responsibilities }}

### **External Dependencies** 
{{ external_system_dependencies }}

## Data Flow Architecture
```mermaid
{{ system_data_flow_diagram }}
```
```

### **ADR Template for Technology Decisions**
```markdown
---
entity_type: ArchitectureDecision
decision_status: accepted
decision_date: {{ current_date }}
decision_topic: {{ technology_choice }}
technology_stack: {{ specific_technologies }}
impact_scope: system
document_purpose: Document discovered technology choice and rationale
---

# ADR-{{ number }}: {{ technology_decision_title }}

## Status
**Accepted** - {{ date }} (Discovered during bootstrap analysis)

## Context
Based on codebase analysis, this project uses {{ technology_stack }}.

## Decision
{{ inferred_decision_rationale }}

## Consequences
{{ analyzed_benefits_and_tradeoffs }}

## Implementation Details
{{ technical_implementation_specifics }}

## Success Metrics
{{ measurable_success_criteria }}

## Review Date
{{ decision_review_conditions }}
```

## Success Criteria

- [ ] `docs/architecture/` created with C4 level documents using templates above
- [ ] `docs/adr/` created with technology decision records using templates above  
- [ ] All documentation has valid YAML frontmatter matching entity schemas
- [ ] Knowledge graph successfully ingested all documentation
- [ ] Architecture search queries return relevant results
- [ ] Major services/components comprehensively documented

Begin the analysis and bootstrap process by following the steps above systematically.