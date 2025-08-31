```mermaid
---
title: "C4 Level 1: System Context - TemporalBridge"
---
flowchart TB
    %% Actors
    DEV[👤 Software Developer<br/>Uses Claude Code for development<br/>tasks and wants persistent memory<br/>across sessions]
    TEAM[👥 Team Member<br/>Other developers working on<br/>shared projects who benefit<br/>from curated knowledge]
    
    %% Core System
    subgraph TB_SYS["TemporalBridge System"]
        TB[🧠 TemporalBridge<br/>AI memory system that creates<br/>searchable, temporal knowledge graphs<br/>from Claude Code conversations using Zep]
    end
    
    %% External Systems
    CLAUDE[🤖 Claude Code<br/>Anthropic's official CLI<br/>for Claude AI assistant]
    ZEP[☁️ Zep Cloud API<br/>Temporal knowledge graph storage<br/>and semantic search platform]
    GIT[📂 Git Repositories<br/>Source code repositories<br/>containing project context]
    FS[💾 Local File System<br/>Local project files, configurations,<br/>and session data]
    PT[👥 Project Teams<br/>Development teams sharing<br/>knowledge through project groups]
    
    %% Main Relationships
    DEV -.->|"Interacts with<br/>CLI commands, conversations"| CLAUDE
    CLAUDE -->|"Sends conversations to<br/>MCP Protocol, Hook system"| TB
    TB <-->|"Stores/retrieves memories<br/>REST API, GraphQL"| ZEP
    TB -.->|"Analyzes project context<br/>Git metadata"| GIT
    TB -.->|"Reads project files<br/>Technology detection, session caching"| FS
    
    %% Knowledge Sharing Workflow
    DEV <-->|"Searches personal knowledge<br/>CLI commands, MCP tools"| TB
    TB -->|"Shares curated knowledge<br/>Project groups"| PT
    TEAM <-.->|"Accesses shared knowledge<br/>Project group search"| PT
    
    %% Data Flows
    TB -.->|"Provides context-aware responses<br/>Memory search results"| CLAUDE
    ZEP -.->|"Returns search results<br/>Semantic search, facts"| TB
    
    %% Styling
    classDef system fill:#1168bd,stroke:#0b4884,stroke-width:2px,color:#fff
    classDef external fill:#999,stroke:#6b6b6b,stroke-width:2px,color:#fff
    classDef person fill:#08427b,stroke:#052e56,stroke-width:2px,color:#fff
    
    class TB system
    class CLAUDE,ZEP,GIT,FS,PT external
    class DEV,TEAM person
```

## User Graph Architecture
- **Personal conversations in user graph** - All conversations stored under single developer ID
- **Manual knowledge curation to project groups** - Deliberate sharing prevents noise
- **Cross-project learning and expertise tracking** - Personal patterns span multiple projects
- **Technology detection and relationships** - Automatic project entity creation

## Knowledge Storage Features
- **Semantic embeddings for conversations** - AI-powered search capabilities
- **Entity-relationship graphs** - Connected knowledge representation
- **Temporal indexing and search** - Time-aware memory retrieval
- **Cross-encoder reranking** - Advanced relevance scoring