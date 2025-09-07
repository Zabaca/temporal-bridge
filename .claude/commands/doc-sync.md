---
description: Analyze recent commit and sync architecture documentation automatically
model: claude-3-5-sonnet-20241022
allowed-tools: mcp__temporal-bridge__search_graph_nodes, mcp__temporal-bridge__search_graph_edges, mcp__temporal-bridge__search_with_filters, mcp__temporal-bridge__find_component_docs, mcp__temporal-bridge__ingest_documentation, Task, Bash, Read, Write, Edit, MultiEdit, Glob, Grep
argument-hint: [commit-hash]
---

# TemporalBridge Documentation Sync Command

Automatically analyzes recent commits and syncs architecture documentation based on code changes.

## Primary Responsibility

**Post-Commit Documentation Automation**
- Analyze specified commit (or most recent) for architectural changes
- Use TemporalBridge architecture agent to evaluate documentation impact
- Update affected documentation files based on agent recommendations
- Re-ingest updated/created documents into knowledge graph
- Ensure documentation stays synchronized with code evolution

## Automated Workflow Process

### **Phase 1: Git Analysis** 
```markdown
1. Extract commit hash (provided or latest)
2. Collect git data: files modified, additions, deletions, commit message
3. Identify file types and basic change patterns
4. Format structured data for agent evaluation
```

### **Phase 2: Architecture Agent Evaluation**
```markdown
1. Pass git data to temporal-bridge-architecture-agent
2. Agent identifies architectural impact: new components, changed relationships, tech stack updates
3. Agent evaluates impact on existing documentation
4. Agent provides specific update recommendations and priority levels
```

### **Phase 3: Documentation Operations**
```markdown
1. Process CREATE operations for new documentation files
2. Process UPDATE operations for existing documentation files
3. Update affected C4 diagrams and component relationships
4. Create new ADRs if major architectural decisions detected
5. Maintain schema compliance and consistency across all operations
```

### **Phase 4: Knowledge Graph Sync**
```markdown
1. Identify all updated/created documentation files
2. Re-ingest documents using mcp__temporal-bridge__ingest_documentation
3. Verify successful ingestion and searchability
4. Report sync completion status
```

## Usage Patterns

### **Post-Commit Analysis** (Most Common)
```bash
# Analyze most recent commit
/doc-sync

# Analyze specific commit
/doc-sync abc123f

# Analyze commit range
/doc-sync abc123f..def456a
```

### **Integration Examples**
```bash
# In git hooks or CI/CD
git commit -m "Add new authentication service"
/doc-sync  # Automatically updates architecture docs

# Manual sync after multiple commits
/doc-sync HEAD~3  # Sync docs for last 3 commits
```

## Command Implementation

### **Commit Analysis Logic**
- **File Impact Assessment**: Identify architectural files (services, components, configs)
- **Technology Detection**: New dependencies, framework changes, infrastructure updates
- **Relationship Changes**: Component interactions, data flow modifications
- **Scale Assessment**: Minor updates vs. major architectural shifts

### **Multi-Agent Integration**

#### **Architecture Agent Integration**
- **Structured Prompting**: Pass git commit analysis to temporal-bridge-architecture-agent
- **Detection Logic**: Agent identifies CREATE vs UPDATE needs using component detection triggers
- **Recommendation Processing**: Parse agent output for specific CREATE/UPDATE operations with priorities
- **Context Extraction**: Extract architectural context, technology stacks, and component relationships

#### **Documentation Generator Agent Integration** 
- **CREATE Operations**: Use temporal-bridge-doc-generator agent for new documentation generation
- **Context Passing**: Provide architectural analysis, component details, and technology stack
- **Template Processing**: Agent uses embedded templates with intelligent content generation
- **Schema Validation**: Agent ensures Zep entity compliance in all generated documentation
- **File Generation**: Agent produces complete, ready-to-write documentation content

### **Documentation Operation Types**

#### **CREATE Operations (New Documentation)**
- **Agent-Generated Content**: Use temporal-bridge-doc-generator agent for intelligent documentation creation
- **Context-Aware Generation**: Pass architectural context to agent for tailored content
- **Schema Compliance**: Agent ensures proper YAML frontmatter and entity validation
- **Intelligent Diagrams**: Agent creates contextual Mermaid diagrams based on architectural understanding

#### **UPDATE Operations (Existing Documentation)**  
- **Content Modification**: Edit existing documentation files based on agent recommendations
- **Diagram Updates**: Modify existing Mermaid diagrams with new relationships
- **Schema Updates**: Update YAML frontmatter with new technology stacks or status changes
- **Cross-Reference Updates**: Update references in related documents

#### **Operation Processing Logic**
1. **Parse Architecture Agent Recommendations**: Extract CREATE vs UPDATE operations from architecture agent
2. **Priority Execution**: Process HIGH priority CREATE operations first
3. **Doc Generator Integration**: Use temporal-bridge-doc-generator agent for CREATE operations
4. **Context Passing**: Provide architectural context, technology stack, and component details to doc generator
5. **File Operations**: Write generated content to specified file paths
6. **Update Operations**: Handle existing file modifications using standard edit operations
7. **Validation**: Ensure all operations maintain C4 methodology and schema compliance

### **Documentation Update Strategies**
- **C4 Diagram Updates**: Modify container/component relationships based on code changes
- **ADR Generation**: Create Architecture Decision Records for significant changes
- **Schema Maintenance**: Ensure all updates maintain proper entity schemas
- **Cross-Reference Validation**: Verify consistency across multiple documentation files

### **Knowledge Graph Ingestion**
- **Batch Processing**: Efficiently re-ingest multiple updated documents
- **Dependency Tracking**: Update related entities and relationships
- **Validation**: Confirm successful ingestion and searchability
- **Error Handling**: Report and retry failed ingestions

## Success Criteria

### **Automation Effectiveness**
- [ ] **Commit Detection**: Successfully identifies architectural changes from git commits
- [ ] **Agent Integration**: Architecture agent provides actionable CREATE/UPDATE recommendations
- [ ] **Operation Accuracy**: Both CREATE and UPDATE operations accurately reflect code modifications
- [ ] **Component Detection**: New containers and complexity growth automatically trigger Level 3 docs
- [ ] **Knowledge Graph Sync**: All created and updated documents successfully ingested and searchable

### **Documentation Quality**
- [ ] **Schema Compliance**: All created and updated documents maintain proper YAML frontmatter
- [ ] **Template Consistency**: New Level 3 docs follow bootstrap template standards
- [ ] **Cross-Reference Accuracy**: References between documents remain accurate after operations
- [ ] **Completeness**: No architectural changes left undocumented (both new and existing)
- [ ] **Timeliness**: Documentation created and updated immediately after commits

### **Developer Experience**
- [ ] **Single Command**: Complete sync accomplished with `/doc-sync`
- [ ] **Clear Reporting**: Status updates and completion confirmation provided
- [ ] **Error Recovery**: Clear error messages with suggested remediation
- [ ] **Optional Targeting**: Ability to sync specific commits or commit ranges

## Implementation Notes

### **Git Integration**
- Use `git show`, `git diff`, and `git log` to analyze commit contents
- Parse commit messages for architectural keywords and intent
- Handle merge commits and multi-file changes appropriately
- Support both single commit and commit range analysis

### **Multi-Agent Communication Workflow**

#### **Architecture Agent Communication**
- **Input**: Git commit analysis (files, changes, technology detection)
- **Process**: Agent analyzes architectural impact and detects documentation needs
- **Output**: CREATE/UPDATE recommendations with priorities and context
- **Error Handling**: Fallback to manual documentation analysis if agent fails

#### **Documentation Generator Agent Communication**
- **Trigger**: When CREATE operations are identified by architecture agent
- **Input**: Architectural context, component details, technology stack, C4 layer specification
- **Process**: Agent generates complete documentation using embedded templates
- **Output**: Ready-to-write documentation content with proper schema compliance
- **Validation**: Verify generated content meets quality and schema requirements

#### **Agent Coordination**
- **Sequential Processing**: Architecture detection → Documentation generation → File operations
- **Context Preservation**: Pass relevant context between agents for consistency
- **Error Recovery**: Graceful degradation if any agent in chain fails
- **Result Validation**: Verify each agent output before proceeding to next phase

### **File Operation Safety**
- Backup documentation files before automated updates
- Use atomic operations to prevent partial updates
- Validate file integrity after modifications
- Support rollback if ingestion fails

### **Performance Optimization**
- Cache agent responses for similar commit patterns
- Batch file operations when possible
- Parallel processing for independent documentation updates
- Minimize redundant knowledge graph operations

Begin commit analysis and documentation synchronization process systematically following the phases above.