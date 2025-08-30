/**
 * TemporalBridge Core Library
 * AI memory system that creates searchable, temporal knowledge graphs
 */

// Types
export * from "./types";

// Core utilities
export * from "./zep-client";
export * from "./project-detector";
export * from "./session-manager";

// Memory and search functionality
export * from "./memory-tools";

// Project entity management
export * from "./project-entities";

// Main exports for common use cases
export {
  // Client setup
  createZepClient,
  getDefaultConfig,
  getDefaultConfigAsync,
  ensureUser,
  ensureThread,
} from "./zep-client";

export {
  // Project detection
  detectProject,
  detectProjectTechnologies,
} from "./project-detector";

export {
  // Memory search
  searchFacts,
  searchMemory,
  getThreadContext,
  getRecentEpisodes,
  getCurrentContext,
  retrieveMemory,
} from "./memory-tools";

export {
  // Project entities
  ensureProjectEntity,
  updateProjectEntity,
  getProjectEntity,
  listProjectEntities,
  getCurrentProjectContext,
} from "./project-entities";

export {
  // Session management
  readSessionInfo,
  writeSessionInfo,
  updateSessionInfo,
  getCurrentSessionId,
  shouldProcessProjectEntity,
  markProjectEntityProcessed,
} from "./session-manager";