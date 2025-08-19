/**
 * TemporalBridge - Zep Client Utilities
 * Shared utilities for interacting with Zep's temporal knowledge graphs
 */

import { ZepClient } from "npm:@getzep/zep-cloud@3.2.0";
import type { ZepConfig } from "./types.ts";
import { detectProject, getScopedUserId, type ProjectContext } from "./project-detector.ts";

// Cache for project context to avoid repeated file reads
let cachedProjectContext: ProjectContext | null = null;
let cacheKey: string | null = null;

/**
 * Initialize Zep client with configuration
 */
export function createZepClient(config?: Partial<ZepConfig>): ZepClient {
  const apiKey = config?.apiKey || Deno.env.get("ZEP_API_KEY");
  
  if (!apiKey) {
    console.error("❌ ZEP_API_KEY environment variable not set");
    throw new Error("ZEP_API_KEY is required");
  }

  return new ZepClient({ apiKey });
}

/**
 * Get cached project context or detect it
 */
async function getCachedProjectContext(): Promise<ProjectContext> {
  const projectDir = Deno.env.get("PROJECT_DIR") || Deno.cwd();
  
  // Check if cache is valid
  if (cachedProjectContext && cacheKey === projectDir) {
    return cachedProjectContext;
  }
  
  // Detect and cache new context
  cachedProjectContext = await detectProject(projectDir);
  cacheKey = projectDir;
  return cachedProjectContext;
}

/**
 * Get default configuration for Zep operations
 * Uses simple developer ID (no project scoping)
 */
export function getDefaultConfig(): ZepConfig {
  // Use DEVELOPER_ID env var or default to "developer"
  const userId = Deno.env.get("DEVELOPER_ID") || "developer";
  
  return {
    apiKey: Deno.env.get("ZEP_API_KEY") || "",
    userId,
    defaultLimit: 10,
    defaultScope: "edges"
  };
}

/**
 * Get default configuration with project context
 * Returns both user config and project context for group graph operations
 */
export async function getDefaultConfigAsync(): Promise<ZepConfig & { projectContext?: ProjectContext }> {
  // Use DEVELOPER_ID env var or default to "developer"
  const userId = Deno.env.get("DEVELOPER_ID") || "developer";
  
  // Get project context for group operations
  const projectContext = await getCachedProjectContext();
  
  return {
    apiKey: Deno.env.get("ZEP_API_KEY") || "",
    userId,
    defaultLimit: 10,
    defaultScope: "edges",
    projectContext
  };
}

/**
 * Ensure user exists in Zep, create if needed
 */
export async function ensureUser(client: ZepClient, userId: string): Promise<void> {
  try {
    await client.user.get(userId);
  } catch (error) {
    try {
      await client.user.add({
        userId: userId,
        firstName: "Developer",
        metadata: {
          tool: "temporal-bridge",
          created_by: "claude-code"
        },
      });
    } catch (createError) {
      // User might already exist, which is fine
      if (
        (createError as any).statusCode === 400 &&
        (createError as any).message?.includes("user already exists")
      ) {
        return;
      } else {
        console.error(`❌ Failed to create user:`, createError);
        throw createError;
      }
    }
  }
}

/**
 * Ensure thread exists in Zep, create if needed
 */
export async function ensureThread(client: ZepClient, threadId: string, userId: string): Promise<void> {
  try {
    await client.thread.create({
      threadId: threadId,
      userId: userId,
    });
  } catch (createError) {
    // Thread might already exist, which is fine
    if (
      (createError as any).statusCode === 409 ||
      (createError as any).message?.includes("already exists")
    ) {
      return;
    } else {
      console.error(`❌ Failed to create thread:`, createError);
      throw createError;
    }
  }
}