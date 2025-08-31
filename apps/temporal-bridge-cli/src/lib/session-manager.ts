/**
 * Session Management for Claude Code
 * Manages the structured .claude-session-id file
 */

import { readFile, writeFile } from 'node:fs/promises';
import { Injectable } from '@nestjs/common';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { ClaudeSessionInfo, ProjectRelationshipType, TechnologyDetectionSource } from './types';

interface ProjectEntity {
  name: string;
  properties?: {
    displayName?: string;
    organization?: string;
    path?: string;
    projectType?: string;
    repository?: string;
  };
}

const SESSION_FILE_NAME = 'temporal-bridge.yaml';

@Injectable()
export class SessionManager {
  async readSessionInfo(projectPath: string): Promise<ClaudeSessionInfo | null> {
    try {
      const sessionFile = `${projectPath}/${SESSION_FILE_NAME}`;
      const content = await readFile(sessionFile, 'utf-8');
      const sessionInfo = parseYaml(content) as ClaudeSessionInfo;
      if (sessionInfo.sessionId && sessionInfo.lastUpdated) {
        return sessionInfo;
      }
      return null;
    } catch (_error) {
      return null;
    }
  }

  async writeSessionInfo(projectPath: string, sessionInfo: ClaudeSessionInfo): Promise<void> {
    try {
      const sessionFile = `${projectPath}/${SESSION_FILE_NAME}`;
      const updatedSessionInfo = {
        ...sessionInfo,
        lastUpdated: new Date().toISOString(),
      };
      const cleanedSessionInfo = this.removeUndefinedValues(updatedSessionInfo);
      await writeFile(sessionFile, stringifyYaml(cleanedSessionInfo), 'utf-8');
    } catch (error) {
      console.error('❌ Failed to write session file:', error);
      throw error;
    }
  }

  async updateSessionInfo(projectPath: string, updates: Partial<ClaudeSessionInfo>): Promise<ClaudeSessionInfo> {
    const existing = await this.readSessionInfo(projectPath);
    const updated: ClaudeSessionInfo = {
      sessionId: updates.sessionId || existing?.sessionId || '',
      lastUpdated: new Date().toISOString(),
      projectEntityCache:
        existing?.projectEntityCache || updates.projectEntityCache
          ? {
              lastProcessed: '',
              success: false,
              ...existing?.projectEntityCache,
              ...updates.projectEntityCache,
            }
          : undefined,
      metadata: {
        ...existing?.metadata,
        ...updates.metadata,
      },
    };
    await this.writeSessionInfo(projectPath, updated);
    return updated;
  }

  async getCurrentSessionId(projectPath: string): Promise<string | null> {
    const sessionInfo = await this.readSessionInfo(projectPath);
    return sessionInfo?.sessionId || null;
  }

  async shouldProcessProjectEntity(projectPath: string, sessionId: string): Promise<boolean> {
    const sessionInfo = await this.readSessionInfo(projectPath);
    if (!sessionInfo) {
      return true;
    }
    if (sessionInfo.sessionId !== sessionId) {
      return true;
    }
    if (!sessionInfo.projectEntityCache?.lastProcessed) {
      return true;
    }
    return false;
  }

  async markProjectEntityProcessed(
    projectPath: string,
    sessionId: string,
    result: {
      success: boolean;
      technologiesDetected?: number;
      projectEntity?: ProjectEntity;
      technologies?: unknown[];
      relationships?: unknown[];
      rawResponses?: unknown;
      performance?: { detectionTimeMs: number; creationTimeMs: number; totalTimeMs: number };
      errors?: string[];
    },
  ): Promise<void> {
    await this.updateSessionInfo(projectPath, {
      sessionId,
      projectEntityCache: {
        lastProcessed: new Date().toISOString(),
        success: result.success,
        technologiesDetected: result.technologiesDetected,
        projectEntity: result.projectEntity
          ? {
              projectId: result.projectEntity.name,
              projectName: result.projectEntity.properties?.displayName || result.projectEntity.name,
              displayName: result.projectEntity.properties?.displayName,
              organization: result.projectEntity.properties?.organization,
              projectPath: result.projectEntity.properties?.path || projectPath,
              projectType:
                (result.projectEntity.properties?.projectType as 'git' | 'directory' | 'unknown') || 'unknown',
              repository: result.projectEntity.properties?.repository,
            }
          : undefined,
        technologies: result.technologies as
          | Array<{
              name: string;
              confidence: number;
              source: TechnologyDetectionSource;
              version?: string;
              context?: string;
            }>
          | undefined,
        relationships: result.relationships as
          | Array<{
              subject: string;
              predicate: ProjectRelationshipType;
              object: string;
              confidence: number;
              context?: string;
            }>
          | undefined,
        rawResponses: result.rawResponses as
          | {
              entityCreation?: unknown;
              relationshipCreation?: unknown;
            }
          | undefined,
        performance: result.performance,
        errors: result.errors,
      },
    });
  }

  private removeUndefinedValues(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return undefined;
    }
    if (Array.isArray(obj)) {
      return obj.map((v) => this.removeUndefinedValues(v)).filter((item) => item !== undefined);
    }
    if (typeof obj === 'object') {
      const cleaned: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (value !== undefined) {
          const cleanedValue = this.removeUndefinedValues(value);
          if (cleanedValue !== undefined) {
            cleaned[key] = cleanedValue;
          }
        }
      }
      return Object.keys(cleaned).length > 0 ? cleaned : undefined;
    }
    return obj;
  }
}

/**
 * Read session information from project directory
 */
export async function readSessionInfo(projectPath: string): Promise<ClaudeSessionInfo | null> {
  try {
    const sessionFile = `${projectPath}/${SESSION_FILE_NAME}`;
    const content = await readFile(sessionFile, 'utf-8');

    const sessionInfo = parseYaml(content) as ClaudeSessionInfo;

    // Validate required fields
    if (sessionInfo.sessionId && sessionInfo.lastUpdated) {
      return sessionInfo;
    }

    return null;
  } catch (_error) {
    // File doesn't exist or can't be read
    return null;
  }
}

/**
 * Remove undefined values from an object recursively to make it YAML-serializable
 */
function removeUndefinedValues(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedValues).filter((item) => item !== undefined);
  }

  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
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
export async function writeSessionInfo(projectPath: string, sessionInfo: ClaudeSessionInfo): Promise<void> {
  try {
    const sessionFile = `${projectPath}/${SESSION_FILE_NAME}`;

    // Ensure lastUpdated is current
    const updatedSessionInfo = {
      ...sessionInfo,
      lastUpdated: new Date().toISOString(),
    };

    // Remove undefined values to prevent YAML serialization errors
    const cleanedSessionInfo = removeUndefinedValues(updatedSessionInfo);

    await writeFile(sessionFile, stringifyYaml(cleanedSessionInfo), 'utf-8');
  } catch (error) {
    console.error('❌ Failed to write session file:', error);
    throw error;
  }
}

/**
 * Update session information with new data
 */
export async function updateSessionInfo(
  projectPath: string,
  updates: Partial<ClaudeSessionInfo>,
): Promise<ClaudeSessionInfo> {
  const existing = await readSessionInfo(projectPath);

  const updated: ClaudeSessionInfo = {
    sessionId: updates.sessionId || existing?.sessionId || '',
    lastUpdated: new Date().toISOString(),
    projectEntityCache:
      existing?.projectEntityCache || updates.projectEntityCache
        ? {
            lastProcessed: '',
            success: false,
            ...existing?.projectEntityCache,
            ...updates.projectEntityCache,
          }
        : undefined,
    metadata: {
      ...existing?.metadata,
      ...updates.metadata,
    },
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
export async function shouldProcessProjectEntity(projectPath: string, sessionId: string): Promise<boolean> {
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
    projectEntity?: ProjectEntity;
    technologies?: unknown[];
    relationships?: unknown[];
    rawResponses?: unknown;
    performance?: {
      detectionTimeMs: number;
      creationTimeMs: number;
      totalTimeMs: number;
    };
    errors?: string[];
  },
): Promise<void> {
  await updateSessionInfo(projectPath, {
    sessionId,
    projectEntityCache: {
      lastProcessed: new Date().toISOString(),
      success: result.success,
      technologiesDetected: result.technologiesDetected,
      projectEntity: result.projectEntity
        ? {
            projectId: result.projectEntity.name,
            projectName: result.projectEntity.properties?.displayName || result.projectEntity.name,
            displayName: result.projectEntity.properties?.displayName,
            organization: result.projectEntity.properties?.organization,
            projectPath: result.projectEntity.properties?.path || projectPath,
            projectType: (result.projectEntity.properties?.projectType as 'git' | 'directory' | 'unknown') || 'unknown',
            repository: result.projectEntity.properties?.repository,
          }
        : undefined,
      technologies: result.technologies as
        | Array<{
            name: string;
            confidence: number;
            source: TechnologyDetectionSource;
            version?: string;
            context?: string;
          }>
        | undefined,
      relationships: result.relationships as
        | Array<{
            subject: string;
            predicate: ProjectRelationshipType;
            object: string;
            confidence: number;
            context?: string;
          }>
        | undefined,
      rawResponses: result.rawResponses as
        | {
            entityCreation?: unknown;
            relationshipCreation?: unknown;
          }
        | undefined,
      performance: result.performance,
      errors: result.errors,
    },
  });
}
