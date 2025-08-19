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
      {
        name: "share_knowledge",
        description: "Share knowledge to project group graph for team collaboration",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The knowledge to share (insights, decisions, learnings, etc.)",
            },
            project: {
              type: "string",
              description: "Target project name (optional, defaults to current project)",
            },
          },
          required: ["message"],
        },
      },
      {
        name: "search_personal",
        description: "Search your personal conversation history and learnings (user graph only)",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for personal memories and conversations",
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
        name: "search_project",
        description: "Search shared project knowledge and decisions (group graph only)",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for project knowledge and shared decisions",
            },
            project: {
              type: "string",
              description: "Project name (optional, defaults to current project)",
            },
            scope: {
              type: "string",
              enum: ["edges", "nodes", "episodes"],
              description: "Search scope: edges=relationships, nodes=entities/concepts, episodes=conversations",
              default: "edges",
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
        name: "search_all",
        description: "Search both personal and project memories with source labels",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query to search across all available memories",
            },
            project: {
              type: "string",
              description: "Project name for group graph (optional, defaults to current project)",
            },
            limit: {
              type: "number",
              description: "Number of results per source (default: 5)",
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
    const { getThreadContext, getRecentEpisodes, getCurrentContext, shareToProjectGroup, searchMemory, searchProjectMemory, searchBothGraphs } = await import("./lib/memory-tools.ts");
    const { getDefaultConfigAsync } = await import("./lib/zep-client.ts");

    switch (name) {

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

      case "share_knowledge":
        const shareResult = await shareToProjectGroup(
          args.message as string,
          args.project as string | undefined
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(shareResult, null, 2),
            },
          ],
        };

      case "search_personal":
        const personalMemory = await searchMemory(
          args.query as string,
          (args.scope as any) || "episodes",
          args.limit as number || 5,
          (args.reranker as any) || "cross_encoder"
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                source: "personal",
                results: personalMemory
              }, null, 2),
            },
          ],
        };

      case "search_project":
        const config = await getDefaultConfigAsync();
        const projectContext = config.projectContext;
        
        if (!projectContext) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "No project context available. Make sure you're in a project directory."
                }, null, 2),
              },
            ],
          };
        }

        const targetGroupId = args.project ? `project-${args.project}` : projectContext.groupId;
        const projectMemory = await searchProjectMemory(
          args.query as string,
          targetGroupId,
          (args.scope as any) || "edges",
          args.limit as number || 5,
          (args.reranker as any) || "cross_encoder"
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                source: "project",
                project: args.project || projectContext.projectName,
                groupId: targetGroupId,
                results: projectMemory
              }, null, 2),
            },
          ],
        };

      case "search_all":
        const configAll = await getDefaultConfigAsync();
        const projectContextAll = configAll.projectContext;
        
        if (!projectContextAll) {
          // Fallback to personal search only if no project context
          const personalOnly = await searchMemory(
            args.query as string,
            "episodes",
            args.limit as number || 5,
            (args.reranker as any) || "cross_encoder"
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  warning: "No project context available. Searching personal memories only.",
                  personal: personalOnly,
                  project: []
                }, null, 2),
              },
            ],
          };
        }

        const targetGroupIdAll = args.project ? `project-${args.project}` : projectContextAll.groupId;
        const allMemories = await searchBothGraphs(
          args.query as string,
          targetGroupIdAll,
          args.limit as number || 5
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                query: args.query,
                project: args.project || projectContextAll.projectName,
                personal: allMemories.personal,
                project_results: allMemories.project
              }, null, 2),
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