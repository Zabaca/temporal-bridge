# Feature Request: Context Block API for Custom/Group Graphs

**Date**: August 31, 2025  
**Submitted by**: TemporalBridge Development Team  
**Priority**: Medium-High  

## **Current Situation**

Zep provides an excellent high-level semantic context API for **user graphs**:

```typescript
const context = await client.thread.getUserContext(threadId, {
  mode: "summary" // Returns optimized, prompt-ready context
});
```

This API provides:
- ✅ **Multi-algorithm fusion** (semantic + full-text + graph traversal + BFS)
- ✅ **Automatic relevance scoring** using recent messages  
- ✅ **LLM-powered summarization** and context assembly
- ✅ **Prompt-optimized output** ready for AI consumption
- ✅ **Cross-thread knowledge** from entire user graph

However, **no equivalent exists for custom/group graphs** that we create via:
```typescript
await client.graph.create({
  graphId: "project-my-custom-graph",
  name: "My Project Knowledge"
});
```

## **Problem Statement**

For custom graphs (project knowledge, team collaboration, domain-specific knowledge), we must use **manual `graph.search()` calls**:

```typescript
// Current approach - manual and limited
const results = await client.graph.search({
  graphId: "project-my-app",
  query: "authentication patterns",
  scope: "edges",
  limit: 5
});
```

**Limitations:**
- ❌ No automatic relevance scoring across different content types
- ❌ No multi-algorithm fusion (semantic + full-text + graph)  
- ❌ No LLM-powered context assembly
- ❌ Raw results require manual formatting for AI prompts
- ❌ No breadth-first search integration
- ❌ Must choose specific scope (edges vs nodes vs episodes)

## **Requested Feature**

### **Primary Request: `graph.getContextBlock()` Method**

```typescript
// Proposed API
const context = await client.graph.getContextBlock({
  graphId: "project-my-app",
  query: "authentication patterns", // or use recent messages like user context
  mode: "summary" | "facts",
  limit?: number,
  scope?: "all" | "edges" | "nodes" | "episodes" // default: "all"
});

// Returns same optimized Context Block format as getUserContext()
```

### **Alternative: Group Context via Threads**

```typescript
// Alternative approach - extend thread context to support group graphs
const context = await client.thread.getGroupContext(threadId, {
  graphId: "project-my-app", 
  mode: "summary"
});
```

## **Use Cases**

### **1. Project Knowledge Management**
```typescript
// Get intelligent context about project architecture decisions
const projectContext = await client.graph.getContextBlock({
  graphId: "project-temporal-bridge",
  query: "microservices architecture patterns"
});
```

### **2. Team Collaboration**
```typescript
// Contextual team knowledge for shared projects
const teamContext = await client.graph.getContextBlock({
  graphId: "team-engineering-best-practices", 
  query: "code review guidelines"
});
```

### **3. Domain-Specific AI Assistants**
```typescript
// Medical AI assistant with domain knowledge graph
const medicalContext = await client.graph.getContextBlock({
  graphId: "medical-knowledge-base",
  query: "hypertension treatment protocols"
});
```

## **Business Value**

### **For Developers**
- **Simplified API**: Single call instead of multiple manual searches
- **Better AI Results**: LLM-optimized context improves AI responses
- **Consistency**: Same high-quality context experience for custom graphs
- **Time Savings**: No need to build custom semantic layers

### **For Zep**
- **Feature Parity**: Completes the graph API offering
- **Competitive Advantage**: Advanced semantic layer for custom knowledge
- **Customer Retention**: Prevents customers from building competing solutions
- **Expanded Use Cases**: Enables enterprise knowledge management scenarios

## **Technical Implementation Suggestions**

### **Approach 1: Extend Existing Context API**
- Reuse existing multi-algorithm fusion logic
- Add `graphId` parameter alongside `userId`
- Maintain same Context Block output format

### **Approach 2: New Graph-Specific API**
- Create dedicated `graph.getContextBlock()` method
- Optimize specifically for custom graph structures
- Support graph-specific features (custom entity types, etc.)

## **Expected Impact**

### **High Impact Use Cases**
- **Enterprise Knowledge Management**: Teams sharing structured knowledge
- **Domain-Specific AI**: Specialized AI assistants with curated knowledge
- **Multi-Project Development**: Developers working across multiple codebases
- **Collaborative Documentation**: Shared architectural decision records

### **Customer Benefits**
- **Reduced Development Time**: No custom semantic layer needed
- **Improved AI Quality**: Better context = better AI responses  
- **Scalability**: Handle large custom knowledge graphs efficiently
- **Consistency**: Same quality experience across user and custom graphs

## **Current Workaround**

We're currently building a custom semantic layer that mimics Zep's approach:

```typescript
// Custom implementation we're building to fill this gap
async getProjectContext(query: string, projectName?: string): Promise<string> {
  // 1. Search edges for specific facts
  const edges = await this.searchProjectEdges(query, projectName);
  
  // 2. Search nodes for entity summaries  
  const nodes = await this.searchProjectNodes(query, projectName);
  
  // 3. Combine with episode search
  const episodes = await this.searchProjectEpisodes(query, projectName);
  
  // 4. Manual relevance scoring and formatting
  return this.formatContextBlock(edges, nodes, episodes);
}
```

**This workaround demonstrates the need and validates the use case**, but requires significant development effort and won't match Zep's LLM-powered optimization.

## **Conclusion**

This feature would **complete Zep's graph offering** by providing the same high-level semantic capabilities for custom graphs that already exist for user graphs. 

The current gap forces customers to either:
1. **Build custom semantic layers** (significant development cost)
2. **Use suboptimal manual searches** (poor AI experience)
3. **Consider alternative solutions** (customer churn risk)

**Request**: Please consider adding `graph.getContextBlock()` or equivalent functionality to provide semantic context retrieval for custom/group graphs.

---

**Contact**: Available for further discussion or technical requirements clarification.