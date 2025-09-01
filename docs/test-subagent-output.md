# Sub-Agent Test Output

**Test Query**: "How are architectural components related to each other in the TemporalBridge system? Please use the knowledge graph tools to explore the relationships and dependencies between components."

**Sub-Agent**: temporal-bridge-project-graph

**Date**: 2025-09-01

---

## Sub-Agent Response:

Based on my exploration of the TemporalBridge knowledge graph, I can provide you with a comprehensive overview of how the architectural components are related to each other in the system.

## System Architecture Overview

The TemporalBridge system follows a **layered architecture** with clear separation of concerns and well-defined relationships between components:

### **Core System Containers**

1. **TemporalBridge CLI** - Main application container with business logic
2. **MCP Server** - Model Context Protocol server for Claude Code integration  
3. **Claude Code Hook** - Automatic conversation capture mechanism
4. **Session Cache** - YAML-based caching layer
5. **Zep Service** - External knowledge graph platform integration

### **Key Component Relationships**

#### **Primary Dependencies (USES/IMPLEMENTS)**

From the knowledge graph analysis, here are the main component relationships:

**CLI Commands Layer:**
- **CLI Commands** → **uses** → **Project Entities Service**
- **CLI Commands** → **uses** → **Memory Tools**

**MCP Integration Layer:**
- **Main Application** → **implements** → **MCP Tools Service**
- **MCP Tools Service** → **implements** → 15 specialized MCP tools including:
  - `search_graph_nodes`, `search_graph_edges`, `search_with_filters`
  - `find_component_docs`, `ingest_documentation`

**Business Logic Layer:**
- **Project Entities Service** → **uses** → **Zep Service**
- **Project Entities Service** → **uses** → **Project Detector**  
- **Project Entities Service** → **uses** → **Session Manager**
- **Memory Tools** → **uses** → **Zep Service**

**Infrastructure Layer:**
- **Zep Service** → **uses** → **Zep Cloud API**
- **Session Manager** → **uses** → **File Operations**

### **Architectural Patterns**

#### **1. User Graph Architecture**
- **Single User Identity**: All projects use the same developer ID for cross-project learning
- **Manual Knowledge Curation**: Insights are deliberately shared via `share_knowledge` tool
- **Privacy by Default**: Personal conversations stay in user graph until manually shared

#### **2. MCP Tool Architecture (ADR-002)**
The system implements **5 specialized MCP tools** rather than a single generic search:
- **Tool Discoverability**: Clear, purpose-specific tool names
- **Type Safety**: Each tool has specific parameter validation
- **Complete Coverage**: All Zep capabilities exposed through specialized interfaces

#### **3. Entity Classification Pipeline (ADR-001)**
Uses **Zep's automatic entity classification** guided by:
- **Structured YAML frontmatter** in documentation
- **Comprehensive ontology descriptions** with 3 entity types:
  - `Architecture` - Components, systems, infrastructure
  - `DataModel` - Schemas, interfaces, data structures  
  - `ArchitectureDecision` - ADRs with status and alternatives

### **Component Interaction Flows**

#### **Memory Search Flow:**
1. **Claude Code** → calls MCP tool → **MCP Tools Service**
2. **MCP Tools Service** → uses → **Memory Tools** 
3. **Memory Tools** → queries → **Zep Service**
4. **Zep Service** → makes API calls → **Zep Cloud API**

#### **Project Detection Flow:**
1. **CLI Commands** → calls → **Project Entities Service**
2. **Project Entities Service** → uses → **Project Detector**
3. **Project Detector** → analyzes → **File System** (package.json, file extensions)
4. **Project Entities Service** → caches results → **Session Manager**

#### **Documentation Knowledge Graph Flow:**
1. **MCP Tools Service** → `ingest_documentation` → **Documentation Ontology**
2. **Documentation Ontology** → sets classification rules → **Zep Service**
3. **Zep Service** → stores with auto-classification → **Zep Cloud API**
4. **Search tools** → query classified entities → **Knowledge Graph**

### **Technology Stack Integration**

The components are integrated through consistent technology choices:

- **Runtime**: Node.js with TypeScript for type safety
- **Framework**: NestJS for dependency injection and modularity
- **CLI**: nest-commander for command-line interface
- **MCP Integration**: @rekog/mcp-nest for protocol handling
- **Storage**: Zep Cloud API for knowledge graph, YAML files for caching
- **Containerization**: Docker deployment model

### **Key Architectural Benefits**

1. **Cross-Project Learning**: Single user identity enables learning patterns across all projects
2. **Progressive Search**: Users can start with broad queries and narrow down efficiently
3. **Automatic Context**: Project detection and technology analysis happen transparently
4. **Deliberate Knowledge Sharing**: Manual curation prevents noise in team knowledge
5. **Type Safety**: Full TypeScript integration with proper interfaces throughout

The system demonstrates a well-architected approach with clear separation of concerns, consistent patterns, and thoughtful integration between components that enables sophisticated AI memory capabilities while maintaining simplicity for end users.