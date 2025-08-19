# When to Use Each Search Tool: Practical Examples

## Decision Flow Chart

```
🤔 What do I need to find?
│
├── 👤 My own experience/preferences
│   └── Use `search_personal`
│
├── 👥 Team decisions/conventions  
│   └── Use `search_project`
│
├── 🔍 Complete picture from all sources
│   └── Use `search_all`
│
└── 📤 Want to share knowledge
    └── Use `share_knowledge`
```

## Scenario-Based Examples

### 🐛 Debugging Scenarios

#### "I've seen this error before"
**Use**: `search_personal`
```
👤: "I'm getting a CORS error in my React app"
🤖: [searches personal memories]
💭: Found: "Last time you fixed CORS by adding proxy in package.json"
```

#### "How does the team handle errors?"
**Use**: `search_project`
```
👤: "What's our error handling strategy?"
🤖: [searches project knowledge]
💭: Found: "Team uses global error boundary with Sentry integration"
```

#### "Show me everything about this error"
**Use**: `search_all`
```
👤: "Memory leak in React component"
🤖: [searches both personal and project]
💭: Personal: "You learned useEffect cleanup prevents leaks"
💭: Project: "Team standard: use AbortController for API calls"
```

### 🏗️ Architecture & Design

#### "What patterns have I used before?"
**Use**: `search_personal`
```
👤: "How did I structure my last API?"
🤖: [searches personal experience]
💭: Found: "You used controller/service/repository pattern with TypeScript"
```

#### "What's our team architecture?"
**Use**: `search_project`
```
👤: "What's our microservices communication pattern?"
🤖: [searches project decisions]
💭: Found: "Team uses event-driven architecture with message queues"
```

#### "Planning new feature architecture"
**Use**: `search_all`
```
👤: "I need to add real-time notifications"
🤖: [searches comprehensive knowledge]
💭: Personal: "You've used WebSockets and Server-Sent Events"
💭: Project: "Team prefers WebSockets for real-time features"
```

### 🛠️ Implementation

#### "How do I usually implement X?"
**Use**: `search_personal`
```
👤: "I need to implement file uploads"
🤖: [searches personal patterns]
💭: Found: "You typically use multer with validation and S3 storage"
```

#### "What's our standard implementation?"
**Use**: `search_project`
```
👤: "How do we handle file uploads in our stack?"
🤖: [searches team standards]
💭: Found: "Team uses signed URLs for direct S3 uploads"
```

#### "Best approach considering everything?"
**Use**: `search_all`
```
👤: "Implementing authentication for the new service"
🤖: [searches all knowledge]
💭: Personal: "You've used Passport.js and custom JWT solutions"
💭: Project: "Team uses Auth0 for consistency across services"
```

### 📝 Documentation & Learning

#### "What did I learn about X?"
**Use**: `search_personal`
```
👤: "What did I learn about React performance?"
🤖: [searches personal learning]
💭: Found: "You discovered React.memo helps with expensive re-renders"
```

#### "What's our documented approach?"
**Use**: `search_project`
```
👤: "What's our testing strategy?"
🤖: [searches project documentation]
💭: Found: "Team uses Jest for unit tests, Cypress for E2E"
```

#### "Complete knowledge on topic"
**Use**: `search_all`
```
👤: "Everything about Docker in our workflow"
🤖: [searches comprehensive knowledge]
💭: Personal: "You prefer multi-stage builds for optimization"
💭: Project: "Team uses Docker Compose for local development"
```

### 🤝 Team Collaboration

#### "What should I share from this solution?"
**Use**: `share_knowledge`
```
👤: "I figured out the memory leak was caused by uncleaned event listeners"
🤖: [after helping solve the issue]
💭: "This seems like valuable knowledge for the team"
🤖: "Should I share this insight with the project?"
👤: "Yes, please"
🤖: [shares knowledge about event listener cleanup]
```

#### "Document team decision"
**Use**: `share_knowledge`
```
👤: "We've decided to use TypeScript strict mode for all new features"
🤖: [documents the decision]
💭: Shared: "Team decision: TypeScript strict mode for type safety"
```

## Context-Specific Guidelines

### 🚀 Starting New Projects

1. **`search_personal`** - "What patterns have worked for me in similar projects?"
2. **`search_project`** - "What standards does this team follow?" (if applicable)
3. **`share_knowledge`** - Document initial architecture decisions

### 🔄 Ongoing Development

1. **`search_personal`** - Quick solutions from your experience
2. **`search_project`** - Verify adherence to team standards
3. **`search_all`** - Complex problems requiring full context

### 🎯 Code Reviews

1. **`search_project`** - Check against team conventions
2. **`search_personal`** - Reference your experience with similar patterns
3. **`share_knowledge`** - Document new patterns discovered during review

### 🆘 Problem Solving

1. **`search_personal`** - "Have I solved this before?"
2. **`search_project`** - "How does the team handle this?"
3. **`search_all`** - "What's everything I know about this domain?"
4. **`share_knowledge`** - Document the solution for future reference

## Query Optimization Tips

### Personal Search (`search_personal`)
**Good queries**:
- "debugging React hooks"
- "my TypeScript preferences"
- "database optimization approaches I've used"

**Avoid**:
- Team-specific terms ("our API", "project conventions")
- Generic questions better suited for project search

### Project Search (`search_project`)
**Good queries**:
- "team authentication strategy"
- "API design patterns we use"
- "deployment process"

**Avoid**:
- Personal experiences ("what I learned", "my approach")
- Cross-team generic patterns

### Combined Search (`search_all`)
**Good queries**:
- "React performance optimization"
- "error handling best practices"
- "database schema design"

**When to use**:
- Starting new features
- Comprehensive problem analysis
- Learning about unfamiliar domains

## Anti-Patterns to Avoid

### ❌ Wrong Tool for the Job
```
# Bad: Using search_project for personal experience
👤: "How do I usually debug React components?"
🤖: [should use search_personal, not search_project]

# Good: Using search_personal for personal patterns
👤: "How do I usually debug React components?"
🤖: [uses search_personal to find your debugging approaches]
```

### ❌ Over-sharing
```
# Bad: Sharing raw debugging process
share_knowledge("I spent 3 hours debugging this CORS issue and tried 10 different solutions")

# Good: Sharing refined solution
share_knowledge("CORS issues in development resolved by adding proxy configuration to package.json")
```

### ❌ Under-utilizing Combined Search
```
# Bad: Multiple separate searches when one combined search would be better
👤: "I need to implement caching"
🤖: [searches personal] [searches project] [presents separately]

# Good: Single combined search for comprehensive view
👤: "I need to implement caching"
🤖: [uses search_all for complete caching knowledge]
```

## Advanced Patterns

### 🔗 Chained Searches
```
1. search_project("authentication") → Learn team approach
2. search_personal("JWT implementation") → Find your experience
3. search_all("authentication security") → Get comprehensive best practices
```

### 🎯 Progressive Refinement
```
1. search_all("database") → Broad overview
2. search_project("PostgreSQL setup") → Team-specific approach
3. search_personal("PostgreSQL performance") → Your optimizations
```

### 📚 Knowledge Building
```
1. search_personal("new learning") → Consolidate your insights
2. share_knowledge("refined knowledge") → Share valuable insights
3. search_project("updated standards") → Verify team adoption
```

## Measuring Success

### Good Search Strategy Results
- ✅ Finds relevant information quickly
- ✅ Avoids re-solving known problems
- ✅ Builds on existing team knowledge
- ✅ Maintains consistency with team patterns

### Signs You're Using Wrong Tool
- ❌ No relevant results found
- ❌ Results don't match what you're looking for
- ❌ Having to search multiple times for same information
- ❌ Team knowledge and personal knowledge getting mixed up

## Quick Reference

| Need | Tool | Example Query |
|------|------|---------------|
| Your past solution | `search_personal` | "how I handled file uploads" |
| Team convention | `search_project` | "our API error handling pattern" |
| Complete knowledge | `search_all` | "React component patterns" |
| Share insight | `share_knowledge` | "Performance: lazy load reduced bundle 40%" |
| Thread context | `get_thread_context` | Get conversation history |
| Recent activity | `get_recent_episodes` | What we worked on recently |

Remember: The right tool finds the right knowledge at the right time. When in doubt, start specific (personal or project) and expand to combined search if needed.