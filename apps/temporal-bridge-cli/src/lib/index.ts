/**
 * TemporalBridge Core Library
 * AI memory system that creates searchable, temporal knowledge graphs
 */

// Types
export * from './types';

// Core utilities
export * from './zep-client';
export * from './project-detector';
export * from './session-manager';

// Memory and search functionality
export * from './memory-tools';

// Project entity management
export * from './project-entities';

// Main exports for common use cases
export {
  // Zep service
  ZepService,
  ZepError,
  type Reranker,
} from './zep-client';

export {
  // Project detection
  detectProject,
  detectProjectTechnologies,
} from './project-detector';

export {
  // Memory search
  MemoryToolsService,
} from './memory-tools';

export {
  // Project entities
  ProjectEntitiesService,
} from './project-entities';

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
  // Session management
  readSessionInfo,
  writeSessionInfo,
  updateSessionInfo,
  getCurrentSessionId,
  shouldProcessProjectEntity,
  markProjectEntityProcessed,
  SessionManager,
} from './session-manager';
