# TemporalBridge Setup Guide

This guide covers detailed installation and configuration of TemporalBridge.

## Prerequisites

### 1. Deno Runtime

Install Deno if you haven't already:

```bash
# macOS/Linux
curl -fsSL https://deno.land/install.sh | sh

# Or via package manager
brew install deno  # macOS
```

### 2. Zep Cloud Account

1. Visit [Zep Cloud](https://cloud.getzep.com)
2. Create an account or sign in
3. Generate an API key from your dashboard
4. Save the API key - you'll need it for configuration

## Installation

### 1. Project Setup

```bash
# Navigate to the project directory
cd /home/uptown/Projects/zabaca/temporal-bridge

# Verify project structure
tree .
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit environment file
nano .env  # or your preferred editor
```

Add your Zep API key:
```bash
ZEP_API_KEY=your_actual_api_key_here
```

### 3. Dependency Installation

```bash
# Install and cache dependencies
deno task install

# Verify installation
deno task check
```

## Claude Code Integration

TemporalBridge integrates with Claude Code using Deno task execution for clean project management.

### Configuration

The integration is already configured in your Claude Code settings to use:
```bash
cd /home/uptown/Projects/zabaca/temporal-bridge && deno task hook
```

This approach:
- ✅ Keeps the project structure clean
- ✅ Automatically uses the latest code
- ✅ Runs from the correct working directory
- ✅ No symlinks or file copying needed

### Verify Hook Integration

```bash
# Check that Claude Code can find the hook
ls -la /home/uptown/.claude/hooks/

# Test hook permissions
/home/uptown/.claude/hooks/store_conversation.ts --help 2>/dev/null || echo "Hook needs execution permissions"
```

## Configuration Options

### Environment Variables

```bash
# Required
ZEP_API_KEY=your_zep_api_key_here

# Optional - Developer identifier (default: "developer")
DEVELOPER_ID=your_name

# Optional - Override auto-detected project group ID
GROUP_ID=custom-project-group-name

# Optional - Project directory (usually auto-detected)
PROJECT_DIR=/path/to/your/project
```

### New User Graph Architecture

TemporalBridge now uses a simplified architecture:

- **User Graph**: All conversations stored under single developer ID
- **Project Groups**: Shared knowledge stored in project-specific groups  
- **Manual Sharing**: Use `share_knowledge` tool to copy insights to project groups
- **Smart Search**: New search tools for personal vs. project vs. combined search

### Deno Configuration

The `deno.json` file includes:

- **Import maps** for Zep SDK
- **Tasks** for common operations
- **Compiler options** for strict TypeScript
- **Formatting rules** for consistent code style

## Verification

### 1. Test Environment

```bash
# Check Zep API connectivity
deno run --allow-env --allow-net -e "
import { ZepClient } from 'npm:@getzep/zep-cloud@3.2.0';
const client = new ZepClient({ apiKey: Deno.env.get('ZEP_API_KEY') });
console.log('✅ Zep client created successfully');
"
```

### 2. Test Memory Retrieval

```bash
# Test basic search functionality
deno task search --query "test" --limit 1

# Test different scopes
deno task search --query "memory" --scope nodes --limit 1
```

### 3. Test Hook (if needed)

```bash
# Create a test transcript file
echo '{"type":"user","message":{"content":"test message"},"uuid":"test-123"}' > /tmp/test-transcript.jsonl

# Test hook processing (creates test data)
echo '{"session_id":"test","transcript_path":"/tmp/test-transcript.jsonl","cwd":"/tmp","hook_event_name":"stop"}' | deno task hook
```

## Troubleshooting

### Common Issues

**1. Permission Errors**
```bash
# Make sure scripts are executable
chmod +x src/retrieve_memory.ts src/hooks/store_conversation.ts
```

**2. API Key Issues**
```bash
# Verify API key is set
echo $ZEP_API_KEY

# Test API key validity
deno run --allow-env --allow-net -e "
import { ZepClient } from 'npm:@getzep/zep-cloud@3.2.0';
try {
  const client = new ZepClient({ apiKey: Deno.env.get('ZEP_API_KEY') });
  await client.user.get({ userId: 'test' });
  console.log('✅ API key valid');
} catch (e) {
  console.log('❌ API key issue:', e.message);
}
"
```

**3. Import Errors**
```bash
# Clear Deno cache if needed
deno cache --reload src/retrieve_memory.ts
```

**4. Hook Not Triggering**
```bash
# Check Claude Code settings
cat /home/uptown/.claude/settings.json | grep -A5 -B5 hook
```

### Debug Mode

Enable debug logging by checking the generated debug files:
```bash
# Check for debug files
ls -la /home/uptown/.claude/*debug*.json

# View latest debug file
ls -t /home/uptown/.claude/*debug*.json | head -1 | xargs cat | jq .
```

## Next Steps

After successful setup:

1. Read the [Usage Guide](usage.md) for command examples
2. Try some example searches to verify functionality
3. Start using Claude Code - your conversations will be automatically stored
4. Explore the search capabilities to see your knowledge graph grow

## Security Notes

- **API Key**: Keep your Zep API key secure and never commit it to version control
- **Permissions**: The hook runs with file system access for transcript reading
- **Debug Files**: May contain conversation content - review before sharing

---

Need help? Check the main [README](../README.md) or review the debug files for troubleshooting information.