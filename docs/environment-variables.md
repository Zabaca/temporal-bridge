# TemporalBridge Environment Variables Reference

## Required Variables

### `ZEP_API_KEY`
- **Purpose**: Authenticate with Zep Cloud API
- **Format**: String (API key from Zep Cloud dashboard)
- **Example**: `ZEP_API_KEY=zep_1234567890abcdef...`
- **Required**: Yes
- **Where to get**: [Zep Cloud Dashboard](https://cloud.getzep.com) → API Keys

## Optional Variables

### `DEVELOPER_ID`
- **Purpose**: Your personal identifier in the knowledge graph
- **Format**: String (alphanumeric, hyphens, underscores)
- **Default**: `"developer"`
- **Example**: `DEVELOPER_ID=alice` or `DEVELOPER_ID=john-smith`
- **Usage**: All your conversations are stored under this ID
- **Migration**: Replaces the old `ZEP_USER_ID` variable

### `GROUP_ID`
- **Purpose**: Override auto-detected project group name
- **Format**: String (alphanumeric, hyphens, underscores)
- **Default**: Auto-generated as `project-{organization}-{projectName}`
- **Example**: `GROUP_ID=my-custom-project-group`
- **Usage**: Useful for:
  - Custom project group naming
  - Sharing groups across multiple projects
  - Avoiding name conflicts

### `PROJECT_DIR`
- **Purpose**: Override project directory detection
- **Format**: Absolute file system path
- **Default**: Current working directory (`${PWD}`)
- **Example**: `PROJECT_DIR=/home/user/projects/my-app`
- **Usage**: Usually auto-detected, override only if needed

## MCP Configuration Examples

### Basic Configuration
```json
{
  "mcpServers": {
    "temporal-bridge": {
      "env": {
        "ZEP_API_KEY": "${ZEP_API_KEY}"
      }
    }
  }
}
```

### Full Configuration
```json
{
  "mcpServers": {
    "temporal-bridge": {
      "env": {
        "ZEP_API_KEY": "${ZEP_API_KEY}",
        "DEVELOPER_ID": "${USER:-developer}",
        "GROUP_ID": "my-team-project",
        "PROJECT_DIR": "${PWD}"
      }
    }
  }
}
```

### Multi-User Setup
```json
{
  "mcpServers": {
    "temporal-bridge": {
      "env": {
        "ZEP_API_KEY": "${ZEP_API_KEY}",
        "DEVELOPER_ID": "alice",
        "GROUP_ID": "shared-project-alpha"
      }
    }
  }
}
```

## Architecture Overview

### User Graph Storage
- All conversations stored under `DEVELOPER_ID`
- Personal knowledge and learnings
- Search with `search_personal` tool

### Project Group Storage
- Shared knowledge stored under `GROUP_ID`
- Team decisions and project-specific insights
- Populated via `share_knowledge` tool
- Search with `search_project` tool

### Combined Search
- `search_all` searches both user graph and project group
- Results labeled by source for clarity

## Environment Variable Precedence

1. **Explicit MCP configuration** (highest priority)
2. **System environment variables**
3. **Default values** (lowest priority)

## Validation

Variables are validated at runtime:

- `ZEP_API_KEY`: Must be present and valid
- `DEVELOPER_ID`: Must contain only alphanumeric characters, hyphens, underscores
- `GROUP_ID`: Must contain only alphanumeric characters, hyphens, underscores
- `PROJECT_DIR`: Must be a valid directory path

## Troubleshooting

### Common Issues

**"ZEP_API_KEY is required"**
- Set the `ZEP_API_KEY` environment variable
- Verify the API key is correct in Zep Cloud dashboard

**"Invalid project name"**
- Check `GROUP_ID` contains only allowed characters
- Use hyphens instead of spaces: `my-project` not `my project`

**"No project context available"**
- Ensure you're in a project directory with git or package.json
- Override with `PROJECT_DIR` if needed
- Check that `PROJECT_DIR` points to a valid directory

### Debug Commands

```bash
# Check environment variables
env | grep -E "(ZEP_API_KEY|DEVELOPER_ID|GROUP_ID|PROJECT_DIR)"

# Test API key
deno run --allow-env --allow-net -e "
import { ZepClient } from 'npm:@getzep/zep-cloud@3.2.0';
const client = new ZepClient({ apiKey: Deno.env.get('ZEP_API_KEY') });
console.log('✅ API key valid');
"

# Test project detection
deno run --allow-env --allow-read src/lib/project-detector.ts
```

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment files** (.env) for local development
3. **Use CI/CD secrets** for deployment environments
4. **Rotate API keys** periodically
5. **Limit API key permissions** in Zep Cloud dashboard

## Migration from Legacy Variables

| Legacy Variable | New Variable | Notes |
|----------------|--------------|-------|
| `ZEP_USER_ID` | `DEVELOPER_ID` | Simplified naming |
| `TEMPORAL_BRIDGE_USER_ID` | `DEVELOPER_ID` | Consolidated |
| Project-scoped user IDs | Single `DEVELOPER_ID` + `GROUP_ID` | Cleaner architecture |

Legacy variables are no longer supported. Update your configuration to use the new variables.