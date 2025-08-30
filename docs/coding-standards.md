# TemporalBridge Coding Standards

## Core Principles

This document establishes coding standards for the TemporalBridge project to ensure consistent, maintainable, and type-safe code across the entire codebase.

## 1. Type Safety - Zero `any` Policy

**Rule**: Never use the `any` type in any circumstance.

**Rationale**: The `any` type disables TypeScript's type checking, which defeats the purpose of using TypeScript. It can lead to runtime errors, makes refactoring dangerous, and reduces IDE support.

### ✅ Correct Approaches

Instead of `any`, use:

1. **Proper Type Definitions**:
   ```typescript
   // ❌ Bad
   const data: any = await api.fetch();
   
   // ✅ Good
   interface ApiResponse {
     id: string;
     name: string;
     metadata?: Record<string, unknown>;
   }
   const data: ApiResponse = await api.fetch();
   ```

2. **Generic Types**:
   ```typescript
   // ❌ Bad
   function processData(data: any): any {
     return data.map((item: any) => item.id);
   }
   
   // ✅ Good
   function processData<T extends { id: string }>(data: T[]): string[] {
     return data.map(item => item.id);
   }
   ```

3. **Union Types**:
   ```typescript
   // ❌ Bad
   const error: any = catchError();
   
   // ✅ Good
   const error: Error | { message: string } | unknown = catchError();
   ```

4. **Type Assertions with Specific Types**:
   ```typescript
   // ❌ Bad
   const userContext = response as any;
   
   // ✅ Good
   interface UserContextResponse {
     context?: string;
     facts?: Array<{
       fact?: string;
       rating?: number;
       created_at?: string;
     }>;
   }
   const userContext = response as UserContextResponse;
   ```

5. **Unknown Type for Truly Unknown Data**:
   ```typescript
   // ❌ Bad
   const jsonData: any = JSON.parse(input);
   
   // ✅ Good
   const jsonData: unknown = JSON.parse(input);
   // Then use type guards to narrow the type
   if (typeof jsonData === 'object' && jsonData !== null) {
     // Safe to use
   }
   ```

### 🚫 Common Anti-Patterns to Avoid

1. **Event Handlers**:
   ```typescript
   // ❌ Bad
   catch (error: any) {
     console.log(error.message);
   }
   
   // ✅ Good
   catch (error: Error | unknown) {
     console.log(error instanceof Error ? error.message : String(error));
   }
   ```

2. **API Responses**:
   ```typescript
   // ❌ Bad
   const result = apiCall() as any;
   
   // ✅ Good
   interface ExpectedResult {
     data: string[];
     status: 'success' | 'error';
   }
   const result = apiCall() as ExpectedResult;
   ```

3. **Third-party Library Integration**:
   ```typescript
   // ❌ Bad
   const client: any = new ExternalLibrary();
   
   // ✅ Good
   // Create proper type definitions or use community types
   import type { ExternalLibraryClient } from '@types/external-library';
   const client: ExternalLibraryClient = new ExternalLibrary();
   ```

## 2. Error Handling

Always provide specific error types:

```typescript
// ❌ Bad
catch (error: any) {
  console.log(error.message);
}

// ✅ Good
catch (error: unknown) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  console.log(errorMsg);
}
```

## 3. Function Parameters

Use specific parameter types:

```typescript
// ❌ Bad
function processEdge(edge: any): EdgeResult {
  return {
    fact: edge.fact || 'Unknown',
    score: edge.score || 0
  };
}

// ✅ Good
interface EdgeInput {
  fact?: string;
  score?: number;
  uuid?: string;
}

function processEdge(edge: EdgeInput): EdgeResult {
  return {
    fact: edge.fact || 'Unknown',
    score: edge.score || 0
  };
}
```

## 4. Configuration and Options

Define clear interfaces for configuration objects:

```typescript
// ❌ Bad
function search(options: any): Promise<any[]> {
  // Implementation
}

// ✅ Good
interface SearchOptions {
  query: string;
  scope?: 'edges' | 'nodes' | 'episodes';
  limit?: number;
  reranker?: 'cross_encoder' | 'mmr';
}

interface SearchResult {
  content: string;
  score: number;
  type: 'edge' | 'node' | 'episode';
}

function search(options: SearchOptions): Promise<SearchResult[]> {
  // Implementation
}
```

## 5. Enforcement

- **Linting**: The project uses Biome with `noExplicitAny` rule enabled
- **Code Review**: All PRs must pass lint checks with zero `any` usage
- **IDE Integration**: Configure your IDE to highlight `any` usage as an error

## 6. Migration Strategy

When encountering existing `any` usage:

1. **Identify the actual type** by examining the data structure
2. **Create proper interfaces** for complex objects
3. **Use type guards** for runtime type checking when necessary
4. **Prefer `unknown`** over `any` when the type is truly unknown
5. **Add TODO comments** if immediate fixing isn't possible, but prioritize fixing them

## Examples from TemporalBridge

### Before (with `any`):
```typescript
const contextWithFacts = userContext as any;
const errorMsg = (error as any).message || String(error);
const threadId = (episode as any).threadId;
```

### After (type-safe):
```typescript
interface UserContextWithFacts {
  facts?: Array<{
    fact?: string;
    rating?: number;
    created_at?: string;
    source_episodes?: string[];
  }>;
}
const contextWithFacts = userContext as UserContextWithFacts;

const errorMsg = error instanceof Error ? error.message : String(error);

const threadId = (episode as { threadId?: string }).threadId;
```

## Conclusion

By eliminating `any` from our codebase, we ensure:
- **Better IDE support** with accurate autocomplete and error detection
- **Safer refactoring** with compile-time error catching
- **Self-documenting code** through explicit type definitions
- **Runtime error prevention** through proper type checking
- **Improved developer experience** with clear interfaces and expectations

Remember: If you're tempted to use `any`, there's almost always a better TypeScript solution. Take the time to find it.