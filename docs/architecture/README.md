# TemporalBridge Architecture Documentation

This directory contains C4 architecture diagrams for the TemporalBridge AI memory system. The diagrams follow the C4 model's hierarchical approach to software architecture visualization.

## C4 Model Overview

The C4 model provides four levels of architectural abstraction:

1. **System Context** - Shows the system and its relationships with users and external systems
2. **Containers** - Shows high-level technology choices and communication between containers  
3. **Components** - Shows components within a container and their relationships
4. **Code** - Shows implementation details like classes and interfaces

## TemporalBridge C4 Diagrams

### Level 1: System Context
**File**: `c4-level1-context.puml`

Shows TemporalBridge in its broader ecosystem:
- **Actors**: Software developers, team members
- **External Systems**: Claude Code, Zep Cloud API, Git repositories, file system
- **Key Relationships**: Conversation capture, knowledge sharing, memory retrieval

**Key Insights**:
- TemporalBridge acts as a bridge between Claude Code and persistent memory storage
- Uses User Graph Architecture for privacy-first personal memory with manual knowledge sharing
- Enables cross-project learning while maintaining team knowledge separation

### Level 2: Containers
**File**: `c4-level2-container.puml`

Shows the main technical components:
- **CLI Application** (Node.js/NestJS) - Direct command-line interface
- **MCP Server** (Node.js/NestJS) - Provides 11 memory tools to Claude Code
- **Hook System** - Automatically captures conversations
- **Session Cache** (YAML files) - Caches project entities and detection results
- **Configuration** (JSON/YAML) - MCP and environment settings

**Key Insights**:
- MCP protocol enables seamless integration with Claude Code
- File-based caching improves performance and reduces API calls
- Modular architecture allows independent CLI and MCP server operation

### Level 3: Components  
**File**: `c4-level3-component.puml`

Shows internal components of the CLI container:
- **Business Logic**: Memory Tools, Project Entities Service, Session Manager
- **Infrastructure**: Zep Client, Project Detector, Conversation Parser
- **Interfaces**: CLI Commands, MCP Tools Service
- **Data Access**: File Operations layer

**Key Insights**:
- Clean separation between business logic and infrastructure
- NestJS dependency injection enables testable, modular design
- Project intelligence provides automatic technology detection and relationship mapping

### Level 4: Code
**File**: `c4-level4-code.puml`

Detailed implementation of the memory search flow:
- **Interfaces**: UnifiedMemoryQuery, UnifiedMemoryResult, SearchMetadata
- **Classes**: MemoryToolsService, ZepService, ProjectDetector
- **Search Algorithm**: Query parsing → Project detection → Search execution → Result processing

**Key Insights**:
- TypeScript interfaces ensure type safety across the search pipeline
- Modular search algorithm supports personal, project, and combined search modes
- Technology detection pipeline provides confidence scoring for reliable project analysis

## Viewing the Diagrams

### Online Rendering
You can view these Mermaid diagrams online by copying the diagram content to:
- [Mermaid Live Editor](https://mermaid.live/)
- [GitHub](https://github.com) - Native support in README files and issues
- [GitLab](https://gitlab.com) - Native support in markdown files

### VS Code Integration
Install the [Mermaid Preview extension](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) to preview diagrams directly in VS Code:

1. Install the extension
2. Open any `.puml` file (contains Mermaid syntax)
3. Press `Ctrl+Shift+V` or use Command Palette: "Markdown: Open Preview to the Side"

### Local Rendering
To generate PNG/SVG images locally using Mermaid CLI:

```bash
# Install Mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# Generate all diagrams as PNG
mmdc -i docs/architecture/c4-level1-context.puml -o docs/architecture/c4-level1-context.png
mmdc -i docs/architecture/c4-level2-container.puml -o docs/architecture/c4-level2-container.png
mmdc -i docs/architecture/c4-level3-component.puml -o docs/architecture/c4-level3-component.png
mmdc -i docs/architecture/c4-level4-code.puml -o docs/architecture/c4-level4-code.png

# Generate as SVG
mmdc -i docs/architecture/c4-level1-context.puml -o docs/architecture/c4-level1-context.svg
```

### GitHub Integration
These diagrams will render automatically in GitHub when viewing the `.puml` files directly in the repository, as they now contain Mermaid syntax wrapped in markdown code blocks.

## Architecture Principles

### User Graph Architecture
- **Single User Identity**: All personal conversations stored under one developer ID
- **Manual Knowledge Curation**: Deliberate sharing to project groups prevents noise
- **Privacy by Default**: Personal learnings stay private until explicitly shared
- **Cross-Project Learning**: Personal patterns and expertise span multiple projects

### Technology Stack Decisions
- **Node.js**: Mature ecosystem, excellent TypeScript support, familiar to most developers
- **NestJS**: Professional framework with dependency injection, decorators, and testing support
- **Zep Cloud**: Specialized temporal knowledge graphs with semantic search capabilities
- **Mermaid**: Modern, widely supported, text-based diagram format with native GitHub/GitLab support

### Design Patterns
- **Dependency Injection**: NestJS container manages service dependencies
- **Service Layer Pattern**: Business logic separated from infrastructure concerns
- **Repository Pattern**: ZepService abstracts external API interactions
- **Factory Pattern**: Project detection creates appropriate technology analyzers
- **Observer Pattern**: Hook system responds to Claude Code conversation events

## Updating the Diagrams

When modifying the architecture:

1. **Update the appropriate level** - Start with the level that best represents your change
2. **Cascade changes** - Update related diagrams to maintain consistency
3. **Validate syntax** - Use PlantUML preview to ensure diagrams render correctly
4. **Update documentation** - Modify this README if new patterns or principles are introduced

### Common Updates
- **New MCP Tools**: Update Level 2 container notes and Level 3 component relationships
- **New Services**: Add to Level 3 components and Level 4 class diagrams
- **External Integrations**: Update Level 1 context and Level 2 container boundaries
- **Technology Changes**: Update Level 2 container technologies and Level 3 dependencies

## Additional Resources

- [C4 Model Documentation](https://c4model.com/)
- [Mermaid Documentation](https://mermaid.js.org/)
- [Mermaid Live Editor](https://mermaid.live/)
- [TemporalBridge Project Documentation](../../README.md)
- [MCP Tools Reference](../mcp-tools-reference.md)
- [Coding Standards](../coding-standards.md)

---

**Note**: These diagrams represent the current Node.js architecture after migration from Deno. They use modern Mermaid syntax for better tooling support and are rendered natively on GitHub/GitLab. The diagrams reflect the User Graph Architecture with manual knowledge curation and the full MCP server integration with 11 available tools.