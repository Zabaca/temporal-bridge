/**
 * TemporalBridge - Zep Client Utilities
 * Shared utilities for interacting with Zep's temporal knowledge graphs
 */

import { ZepClient } from '@getzep/zep-cloud';
export { ZepClient };
import { type ProjectContext, detectProject } from './project-detector';
import type { ZepConfig } from './types';

interface ApiError extends Error {
  statusCode?: number;
}

// Cache for project context to avoid repeated file reads
let cachedProjectContext: ProjectContext | null = null;
let cacheKey: string | null = null;

/**
 * Initialize Zep client with configuration
 */
export function createZepClient(config?: Partial<ZepConfig>): ZepClient {
  const apiKey = config?.apiKey || process.env.ZEP_API_KEY;

  if (!apiKey) {
    console.error('❌ ZEP_API_KEY environment variable not set');
    throw new Error('ZEP_API_KEY is required');
  }

  return new ZepClient({ apiKey });
}

/**
 * Get cached project context or detect it
 */
async function getCachedProjectContext(): Promise<ProjectContext> {
  const projectDir = process.env.PROJECT_DIR || process.cwd();

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
  const userId = process.env.DEVELOPER_ID || 'developer';

  return {
    apiKey: process.env.ZEP_API_KEY || '',
    userId,
    defaultLimit: 10,
    defaultScope: 'edges',
  };
}

/**
 * Get default configuration with project context
 * Returns both user config and project context for group graph operations
 */
export async function getDefaultConfigAsync(): Promise<ZepConfig & { projectContext?: ProjectContext }> {
  // Use DEVELOPER_ID env var or default to "developer"
  const userId = process.env.DEVELOPER_ID || 'developer';

  // Get project context for group operations
  const projectContext = await getCachedProjectContext();

  return {
    apiKey: process.env.ZEP_API_KEY || '',
    userId,
    defaultLimit: 10,
    defaultScope: 'edges',
    projectContext,
  };
}

/**
 * Ensure user exists in Zep, create if needed
 */
export async function ensureUser(client: ZepClient, userId: string): Promise<void> {
  try {
    await client.user.get(userId);
  } catch (_error) {
    try {
      await client.user.add({
        userId: userId,
        firstName: 'Developer',
        metadata: {
          tool: 'temporal-bridge',
          created_by: 'claude-code',
        },
      });
    } catch (createError) {
      const apiError = createError as ApiError;
      // User might already exist, which is fine
      if (apiError.statusCode === 400 && apiError.message?.includes('user already exists')) {
        return;
      }
      console.error('❌ Failed to create user:', createError);
      throw createError;
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
    const apiError = createError as ApiError;
    // Thread might already exist, which is fine
    if (apiError.statusCode === 409 || apiError.message?.includes('already exists')) {
      return;
    }
    console.error('❌ Failed to create thread:', createError);
    throw createError;
  }
}
