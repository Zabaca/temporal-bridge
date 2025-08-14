#!/usr/bin/env -S deno run --allow-env --allow-net

/**
 * TemporalBridge MCP Server
 * Provides memory search and retrieval tools for Claude via MCP protocol
 */

import { Server } from "npm:@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "npm:@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "temporal-bridge",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_facts",
        description: "Search for facts and relationships from past conversations with the developer",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query (e.g., 'debugging approaches', 'TypeScript preferences')",
            },
            limit: {
              type: "number",
              description: "Number of results to return (default: 5)",
              default: 5,
            },
            min_rating: {
              type: "number",
              description: "Minimum fact confidence rating 0-1 (default: no filter)",
            },
            reranker: {
              type: "string",
              enum: ["cross_encoder", "none"],
              description: "Reranker type: cross_encoder for better accuracy, none for faster results (default: cross_encoder)",
              default: "cross_encoder",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "search_memory",
        description: "Search conversation episodes, entities, or content from past interactions",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query",
            },
            scope: {
              type: "string",
              enum: ["edges", "nodes", "episodes"],
              description: "Search scope: edges=relationships, nodes=entities/concepts, episodes=conversations",
              default: "episodes",
            },
            limit: {
              type: "number",
              description: "Number of results to return (default: 5)",
              default: 5,
            },
            reranker: {
              type: "string",
              enum: ["cross_encoder", "none"],
              description: "Reranker type: cross_encoder for better accuracy, none for faster results (default: cross_encoder)",
              default: "cross_encoder",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_thread_context",
        description: "Get comprehensive context summary for a specific Claude Code conversation thread",
        inputSchema: {
          type: "object",
          properties: {
            thread_id: {
              type: "string",
              description: "Claude Code thread ID (format: claude-code-session-id)",
            },
            min_rating: {
              type: "number",
              description: "Minimum fact confidence rating 0-1",
            },
          },
          required: ["thread_id"],
        },
      },
      {
        name: "get_recent_episodes",
        description: "Get recent conversation episodes for context building",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of recent episodes to return (default: 10)",
              default: 10,
            },
          },
        },
      },
      {
        name: "get_current_context",
        description: "Get memory context for current Claude Code session",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (!args) {
    throw new Error("No arguments provided");
  }

  try {
    // Import memory tools dynamically to avoid circular imports
    const { searchFacts, searchMemory, getThreadContext, getRecentEpisodes, getCurrentContext } = await import("./lib/memory-tools.ts");

    switch (name) {
      case "search_facts":
        const facts = await searchFacts(
          args.query as string, 
          args.limit as number, 
          args.min_rating as number,
          (args.reranker as any) || "cross_encoder"
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(facts, null, 2),
            },
          ],
        };

      case "search_memory":
        const memory = await searchMemory(
          args.query as string, 
          (args.scope as any) || "episodes", 
          args.limit as number,
          (args.reranker as any) || "cross_encoder"
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(memory, null, 2),
            },
          ],
        };

      case "get_thread_context":
        const context = await getThreadContext(args.thread_id as string, args.min_rating as number);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(context, null, 2),
            },
          ],
        };

      case "get_recent_episodes":
        const episodes = await getRecentEpisodes(args.limit as number || 10);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(episodes, null, 2),
            },
          ],
        };

      case "get_current_context":
        const currentContext = await getCurrentContext();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(currentContext, null, 2),
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: `Tool execution failed: ${(error as any).message}` }, null, 2),
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TemporalBridge MCP server running on stdio");
}

if (import.meta.main) {
  main().catch(console.error);
}