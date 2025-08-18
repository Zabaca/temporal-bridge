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
 * Uses project-specific user ID for memory isolation
 * 
 * NOTE: This function is synchronous for backward compatibility.
 * For accurate project detection, use getDefaultConfigAsync() instead.
 */
export function getDefaultConfig(): ZepConfig {
  const baseUserId = "developer";
  
  // Check for explicit user ID override first
  const explicitUserId = Deno.env.get("ZEP_USER_ID");
  if (explicitUserId) {
    return {
      apiKey: Deno.env.get("ZEP_API_KEY") || "",
      userId: explicitUserId,
      defaultLimit: 10,
      defaultScope: "edges"
    };
  }
  
  // For synchronous compatibility, use the cached context if available
  let userId = baseUserId;
  
  if (cachedProjectContext && cacheKey === (Deno.env.get("PROJECT_DIR") || Deno.cwd())) {
    userId = getScopedUserId(baseUserId, cachedProjectContext);
  } else {
    // Fallback: must remain sync, so we can't use detectProject here
    // This maintains backward compatibility but may be inaccurate for monorepos
    console.warn("[zep-client] Sync getDefaultConfig() called before async initialization. User ID may be inaccurate for monorepos.");
    userId = baseUserId; // Safe fallback
  }
  
  return {
    apiKey: Deno.env.get("ZEP_API_KEY") || "",
    userId,
    defaultLimit: 10,
    defaultScope: "edges"
  };
}

/**
 * Get default configuration with async project detection
 * Preferred over getDefaultConfig() for accurate project detection
 */
export async function getDefaultConfigAsync(): Promise<ZepConfig> {
  const baseUserId = "developer";
  
  // Check for explicit user ID override first
  const explicitUserId = Deno.env.get("ZEP_USER_ID");
  if (explicitUserId) {
    return {
      apiKey: Deno.env.get("ZEP_API_KEY") || "",
      userId: explicitUserId,
      defaultLimit: 10,
      defaultScope: "edges"
    };
  }
  
  // Use full project detection
  const projectContext = await getCachedProjectContext();
  const userId = getScopedUserId(baseUserId, projectContext);
  
  return {
    apiKey: Deno.env.get("ZEP_API_KEY") || "",
    userId,
    defaultLimit: 10,
    defaultScope: "edges"
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