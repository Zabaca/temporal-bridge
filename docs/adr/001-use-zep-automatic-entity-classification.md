# ADR-001: Use Zep's Automatic Entity Classification for Documentation Knowledge Graph

## Status
**Accepted** - September 1, 2025

## Context

During the implementation of the Documentation Knowledge Graph system for TemporalBridge, we needed to decide how to classify documentation content into appropriate entity types (Architecture, DataModel, ArchitectureDecision) within Zep's knowledge graph.

### Initial Approach (Incorrect)
Our initial plan assumed we could guide Zep's entity classification using metadata hints:

```typescript
// Assumed this would work (it doesn't)
await zepService.graph.add({
  userId: 'developer',
  type: 'text',
  data: content,
  metadata: {
    suggested_entity_type: 'Architecture'  // NOT SUPPORTED
  }
});
```

### Discovery Process
Through extensive research of Zep's documentation and API testing, we discovered:

1. **No `suggested_entity_type` parameter** exists in Zep's API
2. **Automatic Classification**: Zep uses LLM-based entity extraction guided by custom ontology
3. **Content-Based**: Classification happens automatically based on content analysis + entity type descriptions

### Research Findings
- Zep API structure: `graph.add({ userId, type: "text", data })` - no metadata hints
- Classification relies on: Custom ontology definitions + content analysis
- Entity types must be set via `graph.setOntology()` before ingestion

## Decision

**We will use Zep's automatic entity classification guided by structured YAML frontmatter and comprehensive ontology descriptions.**

### Implementation Approach:

1. **Define Rich Entity Types** with descriptive fields:
   ```typescript
   export const ArchitectureSchema: EntityType = {
     description: "Architectural component, system design element, or infrastructure piece",
     fields: {
       component_type: entityFields.text("Type: service, database, api, library"),
       c4_layer: entityFields.text("C4 layer: context, container, component, code"),
       technology_stack: entityFields.text("Technologies: TypeScript, Node.js, React"),
       status: entityFields.text("Status: active, deprecated, planned")
     }
   };
   ```

2. **Add Structured Frontmatter** to guide Zep's understanding:
   ```yaml
   ---
   entity_type: Architecture
   component_type: system
   c4_layer: context
   technology_stack: Node.js, TypeScript, Zep Cloud API
   status: active
   ---
   ```

3. **Simple Ingestion Workflow**:
   ```typescript
   // 1. Set ontology (guides automatic classification)
   await zepService.graph.setOntology(DocumentationEntityTypes, DocumentationEdgeTypes);
   
   // 2. Ingest document - Zep auto-classifies based on ontology + content
   await zepService.graph.add({
     userId: 'developer',
     type: 'text',
     data: markdownWithFrontmatter
   });
   ```

## Consequences

### Positive Outcomes

✅ **Simpler Implementation**: No complex metadata parsing or extraction logic required

✅ **Leverages Zep's Intelligence**: Uses Zep's advanced LLM capabilities for classification

✅ **Maintainable**: Entity definitions and classification logic centralized in ontology

✅ **Flexible**: Easy to add new entity types or modify classification criteria

✅ **Production Ready**: Validated with 23/23 tests passing and real API integration

### Trade-offs

⚠️ **Less Direct Control**: Cannot force specific entity classification per document

⚠️ **Content Dependency**: Classification quality depends on frontmatter and content clarity  

⚠️ **Zep Dependency**: Reliant on Zep's LLM classification algorithms

⚠️ **Debugging Complexity**: Harder to troubleshoot misclassification issues

## Alternatives Considered

### Alternative 1: Manual Metadata Extraction
- **Approach**: Parse YAML frontmatter and manually create entities
- **Rejected Because**: Bypasses Zep's intelligence, more complex implementation
- **Trade-off**: More control vs. significantly more code complexity

### Alternative 2: Custom Entity Extraction Pipeline  
- **Approach**: Build our own content analysis and classification system
- **Rejected Because**: Reinventing Zep's core functionality
- **Trade-off**: Full control vs. substantial development and maintenance overhead

### Alternative 3: Hybrid Approach
- **Approach**: Use frontmatter hints + Zep's automatic classification
- **Rejected Because**: `suggested_entity_type` doesn't exist in Zep's API
- **Trade-off**: Would be ideal but technically impossible

## Implementation Results

The chosen approach successfully delivered:

- **3 Entity Types**: Architecture, DataModel, ArchitectureDecision
- **6 Edge Types**: DOCUMENTS, IMPLEMENTS, SUPERSEDES, DEPENDS_ON, USES_DATA_MODEL, AFFECTED_BY
- **5 MCP Tools**: Specialized documentation query tools
- **Complete Test Coverage**: 23/23 tests passing including E2E with real Zep API
- **Production Validation**: Successfully ingested and classified C4 architecture documents

### Success Metrics Achieved
- ✅ Document ingestion under 10,000 character limit
- ✅ Query response time ~400ms (< 2 second requirement)  
- ✅ Automatic entity classification working with structured frontmatter
- ✅ End-to-end validation with real content

## References

- [Documentation Knowledge Graph Plan](../plans/doc-knowledge-graph-plan.md)
- [Zep Custom Entity Types Documentation](https://help.getzep.com/entity-types)
- [Implementation: doc-ontology.ts](../../apps/temporal-bridge-cli/src/lib/doc-ontology.ts)
- [E2E Test Validation](../../apps/temporal-bridge-cli/src/test/doc-ingestion-search.e2e.test.ts)

## Related Decisions

- **Entity Naming Convention**: SCREAMING_SNAKE_CASE for edge types (required by Zep)
- **Storage Strategy**: User graph with project metadata for documentation
- **Testing Strategy**: 3-layer testing (unit, E2E ingestion, E2E search)

---

**Authors**: Development Team  
**Reviewers**: Claude & Developer  
**Implementation Date**: September 1, 2025  
**Status**: Accepted and Implemented