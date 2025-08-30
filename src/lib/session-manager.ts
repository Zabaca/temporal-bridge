/**
 * Session Management for Claude Code
 * Manages the structured .claude-session-id file
 */

import { parse as parseYaml, stringify as stringifyYaml } from "https://deno.land/std@0.220.1/yaml/mod.ts";
import type { ClaudeSessionInfo } from "./types.ts";

const SESSION_FILE_NAME = "temporal-bridge.yaml";

/**
 * Read session information from project directory
 */
export async function readSessionInfo(projectPath: string): Promise<ClaudeSessionInfo | null> {
  try {
    const sessionFile = `${projectPath}/${SESSION_FILE_NAME}`;
    const content = await Deno.readTextFile(sessionFile);
    
    const sessionInfo = parseYaml(content) as ClaudeSessionInfo;
    
    // Validate required fields
    if (sessionInfo.sessionId && sessionInfo.lastUpdated) {
      return sessionInfo;
    }
    
    return null;
  } catch (error) {
    // File doesn't exist or can't be read
    return null;
  }
}

/**
 * Remove undefined values from an object recursively to make it YAML-serializable
 */
function removeUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return undefined;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedValues).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        const cleanedValue = removeUndefinedValues(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
  
  return obj;
}

/**
 * Write session information to project directory
 */
export async function writeSessionInfo(
  projectPath: string, 
  sessionInfo: ClaudeSessionInfo
): Promise<void> {
  try {
    const sessionFile = `${projectPath}/${SESSION_FILE_NAME}`;
    
    // Ensure lastUpdated is current
    const updatedSessionInfo = {
      ...sessionInfo,
      lastUpdated: new Date().toISOString()
    };
    
    // Remove undefined values to prevent YAML serialization errors
    const cleanedSessionInfo = removeUndefinedValues(updatedSessionInfo);
    
    await Deno.writeTextFile(sessionFile, stringifyYaml(cleanedSessionInfo));
  } catch (error) {
    console.error(`❌ Failed to write session file:`, error);
    throw error;
  }
}

/**
 * Update session information with new data
 */
export async function updateSessionInfo(
  projectPath: string,
  updates: Partial<ClaudeSessionInfo>
): Promise<ClaudeSessionInfo> {
  const existing = await readSessionInfo(projectPath);
  
  const updated: ClaudeSessionInfo = {
    sessionId: updates.sessionId || existing?.sessionId || "",
    lastUpdated: new Date().toISOString(),
    projectEntityCache: (existing?.projectEntityCache || updates.projectEntityCache) ? {
      lastProcessed: "",
      success: false,
      ...existing?.projectEntityCache,
      ...updates.projectEntityCache
    } : undefined,
    metadata: {
      ...existing?.metadata,
      ...updates.metadata
    }
  };
  
  await writeSessionInfo(projectPath, updated);
  
  return updated;
}

/**
 * Get current session ID from session info
 */
export async function getCurrentSessionId(projectPath: string): Promise<string | null> {
  const sessionInfo = await readSessionInfo(projectPath);
  return sessionInfo?.sessionId || null;
}

/**
 * Check if project entity should be processed for this session
 */
export async function shouldProcessProjectEntity(
  projectPath: string,
  sessionId: string
): Promise<boolean> {
  const sessionInfo = await readSessionInfo(projectPath);
  
  // If no session info, process
  if (!sessionInfo) {
    return true;
  }
  
  // If different session ID, process  
  if (sessionInfo.sessionId !== sessionId) {
    return true;
  }
  
  // If no project entity cache exists, process
  if (!sessionInfo.projectEntityCache?.lastProcessed) {
    return true;
  }

  // Project entity already processed for this session
  return false;
}

/**
 * Mark project entity as processed for this session with full details
 */
export async function markProjectEntityProcessed(
  projectPath: string,
  sessionId: string,
  result: {
    success: boolean;
    technologiesDetected?: number;
    projectEntity?: any;
    technologies?: any[];
    relationships?: any[];
    rawResponses?: any;
    performance?: {
      detectionTimeMs: number;
      creationTimeMs: number;
      totalTimeMs: number;
    };
    errors?: string[];
  }
): Promise<void> {
  await updateSessionInfo(projectPath, {
    sessionId,
    projectEntityCache: {
      lastProcessed: new Date().toISOString(),
      success: result.success,
      technologiesDetected: result.technologiesDetected,
      projectEntity: result.projectEntity ? {
        projectId: result.projectEntity.name,
        projectName: result.projectEntity.properties?.displayName || result.projectEntity.name,
        displayName: result.projectEntity.properties?.displayName,
        organization: result.projectEntity.properties?.organization,
        projectPath: result.projectEntity.properties?.path,
        projectType: result.projectEntity.properties?.projectType || 'unknown',
        repository: result.projectEntity.properties?.repository
      } : undefined,
      technologies: result.technologies,
      relationships: result.relationships,
      rawResponses: result.rawResponses,
      performance: result.performance,
      errors: result.errors
    }
  });
}