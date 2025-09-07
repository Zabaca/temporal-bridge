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

### **Phase 3: Documentation Updates**
```markdown
1. Apply agent recommendations to documentation files
2. Update affected C4 diagrams and component relationships
3. Create new ADRs if major architectural decisions detected
4. Maintain schema compliance and consistency
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

### **Agent Integration**
- **Structured Prompting**: Pass commit summary, file changes, and current documentation state
- **Recommendation Processing**: Parse agent output for specific file updates needed
- **Priority Handling**: Execute high-priority updates first, queue lower-priority items

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
- [ ] **Agent Integration**: Architecture agent provides actionable documentation recommendations
- [ ] **Update Accuracy**: Documentation changes accurately reflect code modifications
- [ ] **Knowledge Graph Sync**: All updates successfully ingested and searchable

### **Documentation Quality**
- [ ] **Schema Compliance**: All updated documents maintain proper YAML frontmatter
- [ ] **Consistency**: Cross-document references remain accurate after updates
- [ ] **Completeness**: No architectural changes left undocumented
- [ ] **Timeliness**: Documentation updated immediately after commits

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

### **Agent Communication**
- Structure commit analysis data for optimal agent consumption  
- Process agent recommendations into actionable file operations
- Handle agent errors and fallback to manual documentation review
- Maintain conversation context for follow-up questions

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