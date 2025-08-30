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
  searchFacts,
  searchMemory,
  getThreadContext,
  getRecentEpisodes,
  getCurrentContext,
  retrieveMemory,
  MemoryToolsService,
} from './memory-tools';

export {
  // Project entities
  ProjectEntitiesService,
  listProjectEntities,
  ensureProjectEntity,
} from './project-entities';

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
