/**
 * TemporalBridge Core Library
 * AI memory system that creates searchable, temporal knowledge graphs
 */

// Memory and search functionality
export * from './memory-tools';
export {
  // Memory search
  MemoryToolsService,
} from './memory-tools';
export * from './project-detector';
export {
  // Project detection
  detectProject,
  detectProjectTechnologies,
} from './project-detector';
// Project entity management
export * from './project-entities';
export {
  // Project entities
  ProjectEntitiesService,
} from './project-entities';
export * from './session-manager';
// Types
export * from './types';
// Core utilities
export * from './zep-client';
// Main exports for common use cases
export {
  type Reranker,
  ZepError,
  // Zep service
  ZepService,
} from './zep-client';

// Legacy functions for CLI compatibility - to be refactored
export async function listProjectEntities() {
  const { ZepService } = await import('./zep-client.js');
  const { ProjectEntitiesService } = await import('./project-entities.js');
  const zepService = new ZepService();
  const service = new ProjectEntitiesService(zepService);
  return await service.listProjectEntities();
}

export async function ensureProjectEntity(projectPath: string, options: any = {}) {
  const { ZepService } = await import('./zep-client.js');
  const { ProjectEntitiesService } = await import('./project-entities.js');
  const zepService = new ZepService();
  const service = new ProjectEntitiesService(zepService);
  return await service.ensureProjectEntity(projectPath, options);
}

export {
  getCurrentSessionId,
  markProjectEntityProcessed,
  // Session management
  readSessionInfo,
  SessionManager,
  shouldProcessProjectEntity,
  updateSessionInfo,
  writeSessionInfo,
} from './session-manager';
