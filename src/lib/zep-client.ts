/**
 * TemporalBridge - Zep Client Utilities
 * Shared utilities for interacting with Zep's temporal knowledge graphs
 */

import { ZepClient } from "npm:@getzep/zep-cloud@3.2.0";
import type { ZepConfig } from "./types.ts";

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
 * Get default configuration for Zep operations
 */
export function getDefaultConfig(): ZepConfig {
  return {
    apiKey: Deno.env.get("ZEP_API_KEY") || "",
    userId: "developer",
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