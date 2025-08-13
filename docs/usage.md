# TemporalBridge Usage Guide

This guide covers practical usage patterns and command examples for TemporalBridge.

## Command Line Interface

### Basic Search Syntax

```bash
deno task search [options]

# Or run directly
deno run --allow-env --allow-net src/retrieve_memory.ts [options]
```

### Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--query <text>` | `-q` | Search knowledge graph for specific content | - |
| `--thread <id>` | `-t` | Retrieve context for specific thread | - |
| `--user <id>` | `-u` | User ID for operations | `developer` |
| `--limit <number>` | `-l` | Limit number of results | `10` |
| `--scope <scope>` | `-s` | Search scope: `edges`\|`nodes`\|`episodes` | `edges` |
| `--min-rating <float>` | `-r` | Minimum fact rating filter | - |
| `--reranker <type>` | | Reranker: `cross_encoder`\|`none` | `cross_encoder` |
| `--help` | `-h` | Show help message | - |

## Search Scopes Explained

### Edges (Relationships)
**What**: Facts and relationships between entities
**Best for**: Understanding connections and dependencies

```bash
# Find technical relationships
deno task search --query "graph.add API" --scope edges

# Example output:
# 1. [graph_search] (Score: 0.996)
#    💭 The developer uses the graph.add API
# 2. [graph_search] (Score: 0.994)  
#    💭 graph.add API creates episodes that become part of the knowledge graph
```

### Nodes (Entities)
**What**: Named entities with AI-generated summaries
**Best for**: Getting comprehensive overviews of concepts

```bash
# Get entity summaries
deno task search --query "developer" --scope nodes

# Example output:
# 1. [graph_search] (Score: 0.998)
#    💭 The 'developer' is actively engaged in enhancing the Zep memory system, 
#       particularly in message logging, knowledge graph construction...
```

### Episodes (Conversations)
**What**: Raw conversation content with metadata
**Best for**: Finding specific discussions or detailed context

```bash
# Search conversation history
deno task search --query "debugging approaches" --scope episodes

# Example output:
# 1. [graph_search] (Score: 0.941)
#    💭 Perfect! I've created a comprehensive memory retrieval script...
```

## Common Usage Patterns

### 1. Topic Research

```bash
# Research TypeScript usage in conversations
deno task search --query "TypeScript" --scope episodes --limit 5

# Find TypeScript-related entities
deno task search --query "TypeScript" --scope nodes --limit 3

# See TypeScript relationships
deno task search --query "TypeScript" --scope edges --limit 5
```

### 2. Technical Troubleshooting

```bash
# Find past debugging sessions
deno task search --query "debugging" --scope episodes

# Look for error-related discussions
deno task search --query "error" --scope edges

# Search for specific tools or technologies
deno task search --query "Zep API" --scope nodes
```

### 3. Project Context Retrieval

```bash
# Get context for a specific Claude Code session
deno task search --thread "claude-code-f381f5fb-b0dd-4e66-8e82-5764e505579c"

# Find project-related discussions
deno task search --query "temporal bridge" --scope episodes

# Look for architecture decisions
deno task search --query "architecture" --scope edges
```

### 4. Knowledge Discovery

```bash
# Explore what the system knows about you
deno task search --query "developer" --scope nodes

# Find connections to specific files
deno task search --query "store_conversation.ts" --scope edges

# Discover relationships between concepts
deno task search --query "memory integration" --scope edges
```

## Advanced Usage

### Filtering and Precision

```bash
# High-precision search with rating filter
deno task search --query "Claude Code" --min-rating 0.8 --limit 3

# Disable reranking for faster results
deno task search --query "memory" --reranker none --limit 10

# Large result sets
deno task search --query "developer" --scope episodes --limit 50
```

### Cross-Scope Analysis

```bash
# Multi-scope exploration of a topic
deno task search --query "Zep" --scope edges --limit 3
deno task search --query "Zep" --scope nodes --limit 3  
deno task search --query "Zep" --scope episodes --limit 3
```

### Thread Analysis

```bash
# Get all context for a session
deno task search --thread "claude-code-abc123" --limit 100

# Combine thread context with topic search
deno task search --thread "claude-code-abc123"
deno task search --query "topics from that session" --scope edges
```

## Interpreting Results

### Result Format

```
1. [graph_search] (Score: 0.996) [Processed]
   📅 8/12/2025, 11:33:19 PM
   🆔 Episode: d5611889...
   💭 The developer uses the graph.add API
```

- **Type**: `graph_search`, `user_context`, `thread_message`, `memory_context`
- **Score**: Relevance score (0-1, higher = more relevant)
- **Status**: `Processed` (facts extracted) or `Pending`
- **Timestamp**: When the memory was created
- **Episode ID**: Unique identifier for conversation segment
- **Content**: The actual memory content (truncated at 300 chars)

### Score Interpretation

- **0.9-1.0**: Highly relevant, exact matches
- **0.7-0.9**: Very relevant, strong conceptual matches
- **0.5-0.7**: Moderately relevant, related concepts
- **0.0-0.5**: Loosely related, may contain useful context

## Integration Workflows

### Daily Development

1. **Morning Context**: Check what was discussed yesterday
   ```bash
   deno task search --query "yesterday's topics" --scope episodes --limit 5
   ```

2. **Problem Solving**: Reference past solutions
   ```bash
   deno task search --query "similar error" --scope edges
   ```

3. **Knowledge Building**: See what the system learned
   ```bash
   deno task search --query "developer" --scope nodes
   ```

### Project Management

1. **Status Updates**: Review recent project discussions
   ```bash
   deno task search --query "project status" --scope episodes
   ```

2. **Decision Tracking**: Find architectural decisions
   ```bash
   deno task search --query "architecture decision" --scope edges
   ```

3. **Progress Monitoring**: Track implementation progress
   ```bash
   deno task search --query "implementation" --scope episodes
   ```

## Tips and Best Practices

### Search Strategy

1. **Start Broad**: Begin with general terms, then narrow down
2. **Use Multiple Scopes**: Each scope reveals different perspectives
3. **Leverage Relationships**: Use edges to discover connections
4. **Context Threads**: Use thread IDs for session-specific context

### Query Optimization

- **Specific Terms**: "graph.add API" vs "API"
- **Concept Pairs**: "memory integration" vs "memory"
- **Technical Terms**: Use exact function/file names when possible
- **Natural Language**: Zep understands descriptive queries

### Workflow Integration

1. **Regular Reviews**: Weekly knowledge graph exploration
2. **Problem Solving**: Search before asking new questions
3. **Learning**: Use nodes to see AI-generated summaries
4. **Context Building**: Reference past threads for continuity

## Troubleshooting

### No Results Found

```bash
# Try broader terms
deno task search --query "memory" --scope episodes

# Check different scopes
deno task search --query "your-term" --scope nodes
deno task search --query "your-term" --scope edges

# Verify API connectivity
deno run --allow-env --allow-net -e "console.log(Deno.env.get('ZEP_API_KEY'))"
```

### Poor Search Quality

- **Check spelling**: Typos affect search relevance
- **Use synonyms**: Try alternative terms
- **Combine terms**: "TypeScript functions" vs "TypeScript"
- **Check scope**: Some content may be in different scopes

### Performance Issues

- **Reduce limit**: Use `--limit 5` for faster results
- **Disable reranking**: Use `--reranker none`
- **Specific queries**: Avoid very broad terms

---

## Examples by Use Case

### Software Development
```bash
# Find coding patterns
deno task search --query "function implementation" --scope edges

# Review debugging sessions  
deno task search --query "debugging" --scope episodes

# Check library usage
deno task search --query "npm library" --scope nodes
```

### System Administration
```bash
# Find configuration changes
deno task search --query "configuration" --scope edges

# Review system issues
deno task search --query "system error" --scope episodes

# Check tool usage
deno task search --query "command line" --scope nodes
```

### Learning and Research
```bash
# Explore concepts
deno task search --query "machine learning" --scope nodes

# Find learning resources
deno task search --query "tutorial" --scope episodes

# Track understanding evolution
deno task search --query "concept understanding" --scope edges
```

Ready to explore your temporal knowledge graph? Start with some basic searches and see what TemporalBridge has learned from your conversations!