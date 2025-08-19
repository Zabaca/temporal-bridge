#!/usr/bin/env -S deno run --allow-env --allow-net

/**
 * TemporalBridge - Memory Retrieval CLI
 * Search and retrieve memories from Zep's temporal knowledge graphs
 * Refactored to use centralized memory-tools.ts functions
 */

import { retrieveMemory, type UnifiedMemoryQuery, type UnifiedMemoryResult } from "./lib/memory-tools.ts";

async function main() {
  const args = Deno.args;
  const options: UnifiedMemoryQuery = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--query':
      case '-q':
        options.query = args[++i];
        break;
      case '--thread':
      case '-t':
        options.threadId = args[++i];
        break;
      case '--user':
      case '-u':
        options.userId = args[++i];
        break;
      case '--limit':
      case '-l':
        options.limit = parseInt(args[++i] || '10');
        break;
      case '--scope':
      case '-s':
        options.searchScope = args[++i] as 'edges' | 'nodes' | 'episodes';
        break;
      case '--min-rating':
      case '-r':
        options.minRating = parseFloat(args[++i] || '0');
        break;
      case '--reranker':
        options.reranker = args[++i] as 'cross_encoder' | 'none';
        break;
      case '--debug-list-projects':
        options.debugListProjects = true;
        break;
      case '--debug-portfolio':
        options.debugPortfolio = true;
        break;
      case '--debug-create-entity':
        options.debugCreateEntity = true;
        break;
      case '--help':
      case '-h':
        console.log(`
🧠 TemporalBridge - AI Memory Retrieval

Usage: ./retrieve_memory.ts [options]

Options:
  -q, --query <text>        Search knowledge graph for specific content
  -t, --thread <id>         Retrieve context for specific thread (claude-code-<session>)
  -u, --user <id>           User ID (default: developer)
  -l, --limit <number>      Limit number of results (default: 10-20)
  -s, --scope <scope>       Search scope: edges|nodes|episodes (default: edges)
  -r, --min-rating <float>  Minimum fact rating filter
  --reranker <type>         Reranker: cross_encoder|none (default: cross_encoder)
  --debug-list-projects     Debug list_projects API call
  --debug-portfolio         Debug get_project_portfolio API call
  --debug-create-entity     Create test project entity with corrected labels
  -h, --help               Show this help

Examples:
  ./retrieve_memory.ts --query "typescript functions"
  ./retrieve_memory.ts --thread "claude-code-abc123" --limit 20
  ./retrieve_memory.ts --debug-list-projects
  ./retrieve_memory.ts --debug-portfolio
  ./retrieve_memory.ts --debug-create-entity
  ./retrieve_memory.ts --query "project setup" --scope episodes
  ./retrieve_memory.ts  # Get recent memory facts

TemporalBridge: Bridging conversations across time with AI memory.
        `);
        Deno.exit(0);
    }
  }

  try {
    // Log search operation
    if (options.query) {
      console.log(`🔍 Searching knowledge graph for: "${options.query}"`);
    } else if (options.threadId) {
      console.log(`📝 Retrieving user context for thread: ${options.threadId}`);
    } else {
      console.log(`🧠 Retrieving episodes for user: ${options.userId || 'developer'}`);
    }

    // Perform unified memory retrieval
    const results = await retrieveMemory(options);
    
    if (results.length === 0) {
      console.log("📭 No memory results found");
      return;
    }

    // Display results
    console.log(`\n📚 Found ${results.length} memory results:\n`);
    
    results.forEach((result, index) => {
      const typeDisplay = getTypeDisplay(result.type);
      const scoreDisplay = result.score ? `(Score: ${result.score.toFixed(3)})` : '';
      const statusDisplay = result.metadata.status ? `[${result.metadata.status}]` : '';
      
      console.log(`${index + 1}. [${typeDisplay}] ${scoreDisplay} ${statusDisplay}`);
      
      if (result.timestamp) {
        console.log(`   📅 ${new Date(result.timestamp).toLocaleString()}`);
      }
      
      if (result.metadata.episode_id) {
        console.log(`   🆔 Episode: ${result.metadata.episode_id.substring(0, 8)}...`);
      }
      
      console.log(`   💭 ${result.content.substring(0, 300)}${result.content.length > 300 ? '...' : ''}`);
      console.log();
    });

  } catch (error) {
    console.error("❌ Failed to retrieve memory:", error);
    Deno.exit(1);
  }
}

function getTypeDisplay(type: UnifiedMemoryResult['type']): string {
  switch (type) {
    case 'graph_search': return 'graph_search';
    case 'user_context': return 'user_context';
    case 'recent_episodes': return 'memory_context';
    default: return type;
  }
}

// Run if called directly
if (import.meta.main) {
  await main();
}