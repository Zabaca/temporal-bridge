# Testing Standards for TemporalBridge

## Overview

This document defines the testing standards, practices, and guidelines for the TemporalBridge AI memory system. Our testing approach focuses on **business logic validation** rather than implementation details to ensure robust, maintainable tests.

## Testing Philosophy

### Core Principles

1. **Test Business Logic, Not Implementation**: Focus on what the code should do, not how it does it
2. **Avoid Brittle Tests**: Tests should survive refactoring and internal changes
3. **Clear Test Intent**: Each test should clearly express its purpose and expected behavior
4. **Fast and Reliable**: Tests should run quickly and produce consistent results
5. **Comprehensive Coverage**: Cover all critical business flows and edge cases

### What We Test

✅ **Business Logic Functions**: Core algorithms, calculations, and decision-making logic  
✅ **Data Transformations**: Input validation, data processing, and output formatting  
✅ **Edge Cases**: Boundary conditions, error handling, and exceptional scenarios  
✅ **Integration Points**: How different components interact at the business logic level  

### What We Don't Test

❌ **External API Calls**: Use manual testing for Zep API interactions  
❌ **File System Operations**: Use manual testing for file I/O operations  
❌ **Network Requests**: Use manual testing for external service calls  
❌ **UI/CLI Interactions**: Use manual testing for user interface behavior  
❌ **Implementation Details**: Private functions, internal state, specific algorithms  

## Test Organization

### Directory Structure

```
tests/
├── technology_detection.test.ts     # Technology detection business logic
├── project_entity_logic.test.ts     # Project entity creation and relationships
├── search_analytics_logic.test.ts   # Search algorithms and analytics calculations
└── [feature]_logic.test.ts          # Additional feature-specific logic tests
```

### Naming Conventions

- **Files**: `[feature]_logic.test.ts` (focus on business logic)
- **Test Groups**: `Deno.test("[Feature] - [Category]", async (t) => { ... })`
- **Test Cases**: `await t.step("should [expected behavior] when [condition]", () => { ... })`

### Test Categories

1. **Business Logic Tests**: Core algorithms and decision-making
2. **Data Processing Tests**: Input/output transformations and validations
3. **Edge Case Tests**: Boundary conditions and error scenarios
4. **Integration Logic Tests**: Component interaction patterns

## Writing Effective Tests

### Test Structure (Arrange-Act-Assert)

```typescript
await t.step("should calculate tech expertise score correctly", () => {
  // Arrange: Set up test data
  const techCount = 3;
  const conversations = 25;
  const avgConfidence = 0.9;
  
  // Act: Execute the business logic
  const score = calculateTechExpertiseScore(techCount, conversations, avgConfidence);
  
  // Assert: Verify the expected outcome
  assertEquals(score, 27.5); // 3*2 + 25*0.5 + 0.9*10
});
```

### Mock Data Strategy

- **Use Simple, Predictable Data**: Create minimal test fixtures that clearly demonstrate the logic
- **Focus on Business Scenarios**: Mock data should represent realistic business cases
- **Avoid Complex Setup**: Keep test data simple and easy to understand

```typescript
const mockTechnologies = [
  { name: "TypeScript", confidence: 0.95, source: "package.json", context: "Dependency" },
  { name: "React", confidence: 0.90, source: "package.json", context: "Dependency" }
];
```

### Assertion Guidelines

- **Use Specific Assertions**: Prefer `assertEquals(actual, expected)` over generic assertions
- **Test Multiple Properties**: Verify all relevant aspects of the output
- **Include Context**: Add descriptive messages for complex assertions

```typescript
assertEquals(entity.type, "Project");
assertEquals(entity.name, "test-project");
assertArrayIncludes(entity.properties.technologies, ["TypeScript", "React"]);
assert(entity.properties.confidence["TypeScript"] >= 0.9, "TypeScript confidence should be high");
```

## Test Categories and Examples

### 1. Business Logic Tests

Test core algorithms, calculations, and decision-making logic:

```typescript
Deno.test("Technology Detection - Confidence Scoring", async (t) => {
  await t.step("should combine multiple detections correctly", () => {
    const detections = [
      { name: "React", confidence: 0.9, source: "package.json" },
      { name: "React", confidence: 0.8, source: "file_extensions" }
    ];
    
    const combined = calculateCombinedConfidence(detections);
    const result = combined.find(tech => tech.name === "React");
    
    assert(result.confidence > 0.9, "Combined confidence should include source bonus");
  });
});
```

### 2. Data Processing Tests

Test input validation, transformations, and output formatting:

```typescript
Deno.test("Project Entity Creation - Data Transformation", async (t) => {
  await t.step("should transform project context to entity correctly", () => {
    const projectContext = {
      projectId: "test-project",
      projectName: "Test Project",
      organization: "TestOrg"
    };
    
    const entity = createProjectEntity(projectContext, []);
    
    assertEquals(entity.type, "Project");
    assertEquals(entity.name, "test-project");
    assertEquals(entity.properties.displayName, "Test Project");
  });
});
```

### 3. Edge Case Tests

Test boundary conditions and error scenarios:

```typescript
Deno.test("Relationship Parsing - Edge Cases", async (t) => {
  await t.step("should handle malformed relationships gracefully", () => {
    const malformedFacts = [
      "invalid fact format",
      "project USES", // missing technology
      "WORKS_ON project" // missing developer
    ];
    
    const relationships = parseRelationships(malformedFacts);
    assertEquals(relationships.length, 0, "Should handle malformed facts gracefully");
  });
});
```

### 4. Integration Logic Tests

Test how components interact at the business logic level:

```typescript
Deno.test("Portfolio Analytics - Integration Logic", async (t) => {
  await t.step("should calculate portfolio metrics from project data", () => {
    const projects = [
      { technologies: ["TypeScript", "React"], conversations: 25 },
      { technologies: ["Python"], conversations: 15 }
    ];
    
    const metrics = calculatePortfolioMetrics(projects);
    
    assertEquals(metrics.totalProjects, 2);
    assertEquals(metrics.totalTechnologies, 3);
    assertEquals(metrics.totalConversations, 40);
  });
});
```

## Test Data Management

### Creating Effective Mock Data

1. **Minimal but Complete**: Include only the data needed for the test
2. **Realistic Values**: Use realistic data that represents actual use cases
3. **Clear Relationships**: Make data relationships obvious and easy to follow
4. **Consistent Patterns**: Use consistent naming and structure across tests

### Example Mock Data Structure

```typescript
const mockProject = {
  id: "project-test",
  name: "Test Project",
  technologies: ["TypeScript", "React"],
  conversations: 25,
  lastActivity: "2024-01-20T10:00:00Z",
  organization: "TestOrg"
};

const mockTechnology = {
  name: "TypeScript",
  projects: ["project-a", "project-b"],
  confidence: [0.95, 0.90],
  conversations: [25, 15]
};
```

## Running Tests

### Available Commands

```bash
# Run all tests
deno task test

# Run tests in watch mode (re-run on file changes)
deno task test:watch

# Run tests with coverage reporting
deno task test:coverage

# Run specific test file
deno test --allow-env --allow-read tests/technology_detection.test.ts

# Run specific test case
deno test --allow-env --allow-read tests/ --filter "Technology Detection"
```

### Test Output Interpretation

- **Green/Passing**: ✅ Test validates expected business behavior
- **Red/Failing**: ❌ Business logic doesn't meet requirements
- **Skipped**: ⏭️ Test temporarily disabled (should be rare)

## Coverage Guidelines

### Target Coverage Areas

1. **Critical Business Logic**: 90%+ coverage for core algorithms
2. **Data Transformations**: 85%+ coverage for input/output processing
3. **Edge Cases**: 80%+ coverage for error handling and boundaries
4. **Integration Points**: 75%+ coverage for component interactions

### Coverage Exclusions

- External API integration code
- File I/O operations
- Configuration and setup code
- Logging and debugging utilities

## Best Practices

### Do's ✅

- **Focus on Behavior**: Test what the function should do, not how it does it
- **Use Descriptive Names**: Test names should clearly explain the scenario and expectation
- **Test One Thing**: Each test should validate a single piece of business logic
- **Use Realistic Data**: Mock data should represent actual use cases
- **Test Edge Cases**: Include boundary conditions and error scenarios
- **Keep Tests Independent**: Each test should be able to run in isolation

### Don'ts ❌

- **Don't Test Implementation Details**: Avoid testing private functions or internal state
- **Don't Mock Everything**: Only mock external dependencies, not business logic
- **Don't Write Brittle Tests**: Avoid tests that break when internal implementation changes
- **Don't Ignore Failures**: Fix failing tests immediately, don't skip or ignore them
- **Don't Test External Services**: Leave API calls and external integrations for manual testing
- **Don't Over-Complicate**: Keep tests simple and focused

## Maintenance

### Regular Review

- **Monthly**: Review test coverage and identify gaps
- **Per Feature**: Add tests for new business logic as it's developed  
- **Per Bug Fix**: Add tests to prevent regression of fixed issues

### Refactoring Tests

When business requirements change:

1. **Update Test Intent**: Modify tests to reflect new business rules
2. **Preserve Test Structure**: Keep the same testing patterns and organization
3. **Validate Coverage**: Ensure new requirements are adequately tested
4. **Remove Obsolete Tests**: Clean up tests for removed functionality

## Examples and Templates

### Basic Business Logic Test Template

```typescript
Deno.test("[Feature] - [Category]", async (t) => {
  await t.step("should [expected behavior] when [condition]", () => {
    // Arrange: Set up test data
    const input = createTestInput();
    
    // Act: Execute business logic
    const result = businessLogicFunction(input);
    
    // Assert: Verify expected outcome
    assertEquals(result.property, expectedValue);
    assert(result.isValid, "Result should meet business requirements");
  });
  
  await t.step("should handle edge case gracefully", () => {
    // Test boundary conditions and error scenarios
    const edgeCase = createEdgeCaseInput();
    const result = businessLogicFunction(edgeCase);
    
    assertEquals(result.length, 0, "Should handle edge case appropriately");
  });
});
```

### Data Processing Test Template

```typescript
Deno.test("Data Processing - [Transformation Type]", async (t) => {
  await t.step("should transform input data correctly", () => {
    const rawData = { /* raw input */ };
    const transformed = transformData(rawData);
    
    assertEquals(transformed.format, "expected_format");
    assert(transformed.isValid, "Transformed data should be valid");
  });
});
```

---

## Conclusion

These testing standards ensure that TemporalBridge maintains high code quality while focusing on what matters most: **validating business logic and behavior**. By following these guidelines, we create tests that are reliable, maintainable, and provide confidence in our system's core functionality.

Remember: **Good tests document expected behavior and catch regressions, not implementation details.**