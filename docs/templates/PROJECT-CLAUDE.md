# Project CLAUDE.md Template

This template should be placed in your project root as `CLAUDE.md` to guide Claude Code when using TemporalBridge memory tools.

---

# [Your Project Name] - Claude Configuration

## Project Overview
[Brief description of your project]

## TemporalBridge Memory Integration

This project uses TemporalBridge for AI memory management. Your conversations are stored in your personal memory graph, and you can share important decisions with the team.

### Available Memory Tools

#### 🔍 Search Tools

**`search_personal`** - Search your personal conversation history
```
Use when: Looking for something you discussed before, personal preferences, or past solutions
Example: "How did I solve that React hook issue last week?"
```

**`search_project`** - Search shared project knowledge
```
Use when: Looking for team decisions, project conventions, or shared solutions
Example: "What authentication method did we decide to use?"
```

**`search_all`** - Search both personal and project memories
```
Use when: Need comprehensive context from both sources
Example: "Show me everything about error handling"
```

#### 📝 Knowledge Sharing

**`share_knowledge`** - Share important knowledge with the team
```
Use when: After making architectural decisions, solving complex problems, or establishing patterns
Example: "/share-knowledge We're using JWT with refresh tokens in httpOnly cookies for auth"
```

### Memory Usage Patterns

#### Automatic Personal Memory
All our conversations are automatically saved to your personal memory graph. This includes:
- Questions you ask
- Problems we solve together
- Code we write
- Debugging sessions

#### Manual Project Sharing
Important project knowledge should be explicitly shared using `/share-knowledge`:
- Architectural decisions
- API design choices  
- Bug fixes and their root causes
- Reusable patterns
- Team conventions

### Search Strategy

1. **Start with project search** for team-related questions:
   - "What's our API structure?"
   - "How do we handle authentication?"
   - "What testing framework are we using?"

2. **Use personal search** for your own context:
   - "What was that command I used?"
   - "How did I fix this before?"
   - "What did we discuss yesterday?"

3. **Use combined search** when you need full context:
   - Starting a new feature
   - Debugging complex issues
   - Reviewing architectural decisions

### Examples

#### Finding Past Solutions
```
👤: "I'm getting a CORS error again"
🤖: Let me search your personal memory for past CORS solutions...
    [Uses search_personal("CORS error solution")]
```

#### Checking Team Decisions
```
👤: "What database are we using for this project?"
🤖: Let me check the project knowledge...
    [Uses search_project("database choice decision")]
```

#### Sharing New Knowledge
```
👤: "We've decided to use PostgreSQL with Prisma ORM"
🤖: I'll share this decision with the team.
    [Uses share_knowledge("Database: PostgreSQL with Prisma ORM for type-safe queries")]
```

## Project-Specific Context

### Tech Stack
[List your technologies]

### Conventions
[List coding conventions]

### Architecture
[Describe architecture patterns]

## Important Notes

- **Privacy**: Your personal conversations remain private unless explicitly shared
- **Quality**: Only share refined, useful knowledge to the project graph
- **Attribution**: Shared knowledge includes timestamp but not personal attribution
- **Search First**: Always search before implementing to leverage existing knowledge

## Setup Instructions

### 1. Copy this file to your project root as `CLAUDE.md`
### 2. Update project-specific sections below
### 3. Add TemporalBridge to your `.mcp.json`:

```json
{
  "mcpServers": {
    "temporal-bridge": {
      "type": "stdio",
      "command": "deno",
      "args": ["run", "--allow-env", "--allow-net", "--allow-read", "~/Projects/zabaca/temporal-bridge/src/mcp-server.ts"],
      "cwd": "~/Projects/zabaca/temporal-bridge",
      "env": {
        "ZEP_API_KEY": "${ZEP_API_KEY}",
        "PROJECT_DIR": "${PWD}",
        "DEVELOPER_ID": "${USER:-developer}"
      }
    }
  }
}
```

### 4. Set your environment variables:
```bash
export ZEP_API_KEY=your_zep_api_key_here
export DEVELOPER_ID=your_name  # Optional, defaults to "developer"
```

## Quick Commands

- **Search your memory**: "What did I work on last week?"
- **Search project**: "What are our API conventions?"  
- **Share knowledge**: `/share-knowledge [important decision or pattern]`
- **Combined search**: "Show me everything about authentication"
- **Get context**: "What's the current thread context?"

## Best Practices

### ✅ Do Share
- Architecture decisions: "We're using microservices with API Gateway"
- Conventions: "Use camelCase for variables, PascalCase for components"
- Bug fixes: "Memory leaks fixed by cleaning up event listeners in useEffect"
- Performance insights: "Bundle size reduced 40% by lazy loading routes"

### ❌ Don't Share
- Personal debugging struggles: "I spent 3 hours figuring this out"
- Incomplete thoughts: "Maybe we should try..."
- Sensitive information: API keys, passwords, personal data
- Non-actionable complaints: "This framework is confusing"

---

**Remember**: Your personal learning journey stays private. Share the polished insights that help the team grow.