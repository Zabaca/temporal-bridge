# Documentation Knowledge Graph Testing Strategy

This directory contains tests for the Documentation Knowledge Graph system with a multi-layered testing approach to handle real API dependencies and timing issues.

## Test File Structure

### 1. **Unit Tests** - `doc-integration.test.ts`
- **Purpose**: Fast, isolated tests with mocked dependencies
- **Coverage**: Business logic, ontology validation, error handling
- **Dependencies**: All external services mocked using `vitest-mock-extended`
- **Runtime**: ~500ms, no API calls
- **Status**: ✅ All 11 tests passing

### 2. **E2E Tests** - `doc-ingestion.e2e.test.ts`
- **Purpose**: Independent end-to-end tests with real Zep API
- **Coverage**: Document ingestion, ontology setup, error validation
- **Dependencies**: Real Zep Cloud API using `test.env` credentials
- **Runtime**: ~5s, creates fresh test project graph
- **Status**: ✅ All 6 tests passing

### 3. **Integration Tests** - `doc-ingestion.integration.test.ts`
- **Purpose**: Dependent tests requiring prior E2E test setup
- **Coverage**: Search functionality, ontology verification post-setup
- **Dependencies**: Requires E2E tests to run first (graph must exist)
- **Runtime**: ~15s, tests search on existing documentation
- **Status**: ⚠️ Run after E2E tests for full validation

## Test Environment Setup

### Environment Configuration
```bash
# test.env (auto-loaded by Vitest)
ZEP_API_KEY=your_zep_api_key_here
DEVELOPER_ID=test-developer
NODE_ENV=test
```

### Running Tests

```bash
# 1. Unit tests (fast, mocked)
pnpm test src/test/doc-integration.test.ts

# 2. E2E tests (creates fresh data)
pnpm test src/test/doc-ingestion.e2e.test.ts

# 3. Integration tests (requires E2E setup)
pnpm test src/test/doc-ingestion.integration.test.ts

# Run all documentation tests
pnpm test src/test/doc-
```

## Test Dependencies & Timing

### Why Separate Test Files?

**E2E Tests** are completely independent:
- Create fresh project graphs with unique names
- Test core ingestion functionality
- No dependencies on previous test runs
- ✅ **Always pass** with proper API key

**Integration Tests** have dependencies:
- Expect project graphs to already exist
- Test search functionality on ingested content
- Require Zep processing time for indexing
- ⚠️ **May need multiple runs** after E2E tests

### API Rate Limiting & Timing
- **Zep Processing Time**: 2-15 seconds for content indexing
- **Graph Setup**: 500-1000ms per project graph creation
- **Search Queries**: 200-500ms per search operation
- **Recommendation**: Run E2E tests first, then integration tests after a brief pause

## Key Testing Scenarios

### ✅ Verified Functionality
1. **Ontology Management**: Custom entity/edge types, validation, setup
2. **Document Ingestion**: C4 docs with frontmatter, content size limits
3. **Error Handling**: Missing parameters, oversized content
4. **Project Graph Creation**: Automatic ontology setup
5. **MCP Tools**: 5 new specialized documentation query tools

### 🔄 Timing-Dependent Tests
1. **Search Functionality**: Requires Zep indexing time
2. **Entity Classification**: Needs ontology processing
3. **Cross-Document Queries**: Depends on multiple ingested documents

## Best Practices

### For CI/CD Pipelines
```bash
# Run in sequence with pauses for Zep processing
pnpm test src/test/doc-integration.test.ts      # Unit tests
pnpm test src/test/doc-ingestion.e2e.test.ts    # E2E setup
sleep 5                                          # Allow Zep processing
pnpm test src/test/doc-ingestion.integration.test.ts  # Integration verification
```

### For Development
```bash
# Quick validation during development
pnpm test doc-integration

# Full system validation with real API
pnpm test doc-ingestion.e2e

# Search functionality testing (after E2E)
pnpm test doc-ingestion.integration
```

## Test Data

### C4 Documentation
- **Source**: `../../../../docs/architecture/c4-level*.md`
- **Format**: Markdown with YAML frontmatter
- **Ontology Fields**: `entity_type`, `c4_layer`, `technology_stack`, etc.
- **Size**: All under 10,000 character limit

### Project Graph
- **Test Project**: `test-doc-ingestion`
- **Graph ID**: `project-test-doc-ingestion`
- **Ontology**: 3 entity types, 6 edge types
- **Content**: C4 architecture documentation with structured metadata

## Troubleshooting

### Integration Tests Failing
- **Cause**: E2E tests haven't run recently or Zep needs processing time
- **Solution**: Run E2E tests first, wait 10-15 seconds, then run integration tests

### API Authentication Errors
- **Cause**: Missing or invalid `test.env` file
- **Solution**: Ensure `test.env` contains valid `ZEP_API_KEY`

### Ontology Setup Issues
- **Cause**: Edge type naming (must be SCREAMING_SNAKE_CASE)
- **Solution**: Verify ontology schema matches Zep requirements

---

**Summary**: This testing strategy provides comprehensive coverage from unit to integration level, handling both immediate functionality and time-dependent API behavior.