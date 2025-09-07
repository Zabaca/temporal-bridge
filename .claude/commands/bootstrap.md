---
description: Bootstrap TemporalBridge architecture documentation for new projects
model: claude-3-5-sonnet-20241022
allowed-tools: mcp__temporal-bridge__search_graph_nodes, mcp__temporal-bridge__search_graph_edges, mcp__temporal-bridge__search_with_filters, mcp__temporal-bridge__find_component_docs, mcp__temporal-bridge__ingest_documentation, Task, Glob, Read, Bash
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

**SCOPE LIMITATION**: Bootstrap generates C4 Levels 1-3 only. Do NOT create Level 4 (Code) documentation.

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
2. Use temporal-bridge-doc-generator agent to create documentation:
   - c4-level1-context.md (system overview)
   - c4-level2-container.md (all containers in this system) 
   - c4-level3-{container-name}.md (components per container)
3. Generate initial ADRs documenting major technology and architectural decisions
4. Pass discovered architectural context to doc generator for intelligent content creation

IMPORTANT: Bootstrap generates ONLY summary documents. Detailed expansions are created manually when needed.
Do NOT generate C4 Level 4 (Code) documentation during bootstrap.
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

### **Summary Documentation Structure**

**Generated Documents (Bootstrap Creates These Only):**
- `docs/architecture/`
  - `c4-level1-context.md` - System context overview
  - `c4-level2-container.md` - All containers in this system
  - `c4-level3-{container-name}.md` - Components per container
- `docs/adr/` - Architecture Decision Records

**Naming Convention:**
```
c4-level{N}[-{container-name}].md
```

**Bootstrap Examples:**
- `c4-level1-context.md` - System context and external dependencies
- `c4-level2-container.md` - All containers in the system
- `c4-level3-frontend.md` - Frontend container components
- `c4-level3-api.md` - API container components
- `c4-level3-database.md` - Database container components

**Manual Expansion (Created Later When Needed):**
- `c4-level1-context-payment-gateway.md` - Payment system deep dive
- `c4-level2-frontend.md` - Detailed frontend container breakdown
- `c4-level3-frontend-ui-components.md` - UI component group focus

**Integration Requirements:**
- Proper YAML frontmatter for Zep knowledge graph ingestion
- **Mermaid diagrams** in all summary documents
- **Consistent hierarchical naming** for future expansion compatibility


## Documentation Generator Agent Integration

### **Agent-Based Documentation Generation**

Bootstrap uses the **temporal-bridge-doc-generator** agent to create all documentation with embedded templates and intelligent content generation.

#### **Agent Benefits**
- **Consistent Templates**: All C4 levels use standardized embedded templates
- **Schema Compliance**: Automatic Zep entity schema validation
- **Intelligent Content**: Context-aware documentation generation beyond simple templates
- **Quality Assurance**: Built-in validation and best practices enforcement

#### **Agent Communication Protocol**
```markdown
1. **Project Analysis**: Bootstrap analyzes codebase and detects architectural patterns
2. **Context Preparation**: Prepare architectural context for agent consumption
3. **Agent Invocation**: Call doc-generator with specific C4 level and context
4. **Content Generation**: Agent uses embedded templates with intelligent substitution
5. **File Creation**: Write generated content to appropriate documentation files
```

#### **Generated Documentation Types**
- **C4 Level 1 (Context)**: System boundaries and external relationships
- **C4 Level 2 (Container)**: Internal container architecture
- **C4 Level 3 (Component)**: Component breakdown per container
- **ADRs**: Architecture Decision Records for technology choices

#### **Context Data Passed to Agent**
```yaml
project_analysis:
  name: "detected_project_name"
  technology_stack: ["detected", "technologies"]
  containers: ["identified", "containers"]
  external_systems: ["discovered", "dependencies"]
  architectural_patterns: ["patterns", "found"]
  
generation_request:
  c4_layer: "context|container|component"
  document_type: "architecture|adr"
  container_name: "specific_container" # for Level 3 only
  component_details: [...] # detected components
```

## C4 Level Guidance by Project Type

### **Frontend/Web Applications**
- **Level 1 (Context)**: External users, browsers, CDNs, analytics services
- **Level 2 (Container)**: Web app, API services, databases, external integrations
- **Level 3 (Component)**: Architectural systems (routing engine, state management, rendering pipeline, styling system) 
  - ❌ **Avoid**: Individual UI components (Button, Modal, Card components)
  - ✅ **Focus**: System-level building blocks and their interactions
  - ⚠️ **STOP HERE**: Do not create Level 4 documentation during bootstrap

### **Backend/API Applications**
- **Level 1 (Context)**: Client applications, external services, data sources
- **Level 2 (Container)**: API server, databases, message queues, caching layers
- **Level 3 (Component)**: Service layers (controllers, business logic, data access, authentication)
  - ❌ **Avoid**: Individual classes, functions, or data models
  - ✅ **Focus**: Logical service boundaries and responsibilities

### **Microservices/Distributed Systems**
- **Level 1 (Context)**: Users, external systems, service boundaries
- **Level 2 (Container)**: Individual microservices, databases, message brokers
- **Level 3 (Component)**: Internal service components (message handlers, processors, adapters, gateways)
  - ❌ **Avoid**: Implementation details or individual endpoints
  - ✅ **Focus**: Major functional areas within each service

### **CLI/Desktop Applications**
- **Level 1 (Context)**: Users, file system, external tools, networks
- **Level 2 (Container)**: Main application, configuration, data storage
- **Level 3 (Component)**: Core subsystems (command processor, plugin system, data manager)
  - ❌ **Avoid**: Individual commands or utility functions
  - ✅ **Focus**: Major architectural subsystems and their roles

## C4 Level 4 (Code) - Not Included in Bootstrap

**Level 4 focuses on code-level implementation details** and is typically not generated during bootstrap as it requires deep code analysis:

### **What Level 4 Contains:**
- **Individual Classes and Interfaces** - Specific class diagrams with methods and properties
- **Implementation Details** - Code-level patterns, algorithms, data structures
- **Detailed Relationships** - Inheritance, composition, dependency injection patterns
- **Code Organization** - Package structures, namespaces, module dependencies

### **Examples by Project Type:**
- **Frontend**: Individual React components (Button, Modal), custom hooks, utility functions
- **Backend**: Specific controller classes, service implementations, data access objects
- **CLI**: Command classes, argument parsers, individual utility functions

### **When to Create Level 4 Documentation:**
- **Complex architectural patterns** need code-level explanation
- **Team onboarding** requires understanding of key implementation details  
- **API design** documentation for library or framework development
- **Legacy system** documentation where code is the primary documentation source

**Note**: Level 4 is created manually when needed, not during automated bootstrap processes.

## Success Criteria

- [ ] **Summary documents generated**: `c4-level1-context.md`, `c4-level2-container.md`, `c4-level3-{container}.md`
- [ ] **Hierarchical naming convention** followed for all generated summary documents
- [ ] `docs/adr/` created with technology decision records using templates above  
- [ ] All documentation has valid YAML frontmatter matching entity schemas
- [ ] C4 levels follow appropriate abstraction guidance for project type
- [ ] **CRITICAL**: No C4 Level 4 (Code) documentation generated during bootstrap
- [ ] **CRITICAL**: No expansion documents generated - summaries only
- [ ] Knowledge graph successfully ingested all summary documentation
- [ ] Architecture search queries return relevant results
- [ ] Major services/components summarized at appropriate abstraction levels

Begin the analysis and bootstrap process by following the steps above systematically.