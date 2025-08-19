/**
 * TemporalBridge - Shared TypeScript interfaces and types
 * Temporal AI memory using Zep's knowledge graphs
 */

export interface MemoryQuery {
  query?: string;
  threadId?: string;
  userId?: string;
  limit?: number;
  searchScope?: 'edges' | 'nodes' | 'episodes';
  minRating?: number;
  reranker?: 'cross_encoder' | 'none';
}

export interface MemoryResult {
  content: string;
  score?: number;
  timestamp?: string;
  metadata?: any;
  type: 'memory_context' | 'thread_message' | 'graph_search' | 'user_context';
}

export interface HookData {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: string;
  stop_hook_active?: boolean;
}

export interface TranscriptMessage {
  type: string;
  sender?: string;
  text?: string;
  content?: string;
  timestamp?: string;
  uuid?: string;
  parentUuid?: string;
  message?: any;
}

export interface ParsedMessage {
  role: string;
  name: string;
  content: string;
  uuid: string;
  parentUuid?: string;
  timestamp?: string;
}

export interface ZepConfig {
  apiKey: string;
  userId?: string;
  defaultLimit?: number;
  defaultScope?: 'edges' | 'nodes' | 'episodes';
  projectContext?: {
    projectId: string;
    groupId: string;
    projectPath: string;
    projectName: string;
    projectType: 'git' | 'directory' | 'unknown';
    gitRemote?: string;
    organization?: string;
  };
}

// Project Entity Schema for Zep Knowledge Graph
export interface ProjectEntityProperties {
  /** Human-readable project name */
  displayName: string;
  /** Organization/namespace (e.g., "zabaca") */
  organization?: string;
  /** Git remote URL if available */
  repository?: string;
  /** Project type detection */
  projectType: 'git' | 'directory' | 'unknown';
  /** Detected technology stack */
  technologies: string[];
  /** Local filesystem path */
  path: string;
  /** Entity creation timestamp */
  created: string;
  /** Last updated timestamp */
  lastUpdated: string;
  /** Technology detection confidence scores */
  confidence: Record<string, number>;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface ProjectEntity {
  /** Zep entity type */
  type: "Project";
  /** Unique project identifier (same as projectId) */
  name: string;
  /** Rich project metadata */
  properties: ProjectEntityProperties;
}

// Standard Relationship Types for Project Entities
export type ProjectRelationshipType = 
  | "WORKS_ON"      // developer WORKS_ON project
  | "USES"          // project USES technology
  | "BELONGS_TO"    // project BELONGS_TO organization
  | "OCCURS_IN"     // session OCCURS_IN project
  | "DISCUSSED_IN"; // topic DISCUSSED_IN project

export interface ProjectRelationship {
  /** Subject entity name */
  subject: string;
  /** Relationship type */
  predicate: ProjectRelationshipType;
  /** Object entity name */
  object: string;
  /** Relationship confidence score (0-1) */
  confidence?: number;
  /** Additional context */
  context?: string;
}

// Technology Detection Types
export interface TechnologyDetection {
  /** Technology name (e.g., "TypeScript", "React", "Deno") */
  name: string;
  /** Detection confidence score (0-1) */
  confidence: number;
  /** Detection source */
  source: TechnologyDetectionSource;
  /** Version if detected */
  version?: string;
  /** Additional context about detection */
  context?: string;
}

export type TechnologyDetectionSource = 
  | "package.json"     // Package dependencies
  | "deno.json"        // Deno configuration
  | "file_extensions"  // File extension analysis
  | "framework"        // Framework-specific patterns
  | "database"         // Database configuration
  | "docker"           // Containerization
  | "config_files"     // Other configuration files
  | "code_patterns"    // Code pattern analysis
  | "unknown";         // Unknown or fallback source

export interface TechnologyDetectionResult {
  /** All detected technologies */
  technologies: TechnologyDetection[];
  /** Overall confidence score */
  overallConfidence: number;
  /** Detection timestamp */
  detectedAt: string;
  /** Project path analyzed */
  projectPath: string;
}

// Entity Management Types
export interface EntityCreationOptions {
  /** Force update even if entity exists */
  forceUpdate?: boolean;
  /** Skip technology detection */
  skipTechDetection?: boolean;
  /** Custom confidence threshold */
  confidenceThreshold?: number;
}

/**
 * Claude Code Session Information
 * Stored in .claude-session-id file as JSON
 */
export interface ClaudeSessionInfo {
  /** Current session ID */
  sessionId: string;
  /** When this session was created/last updated */
  lastUpdated: string;
  /** Project entity creation cache */
  projectEntityCache?: {
    /** Last time project entity was processed for this session */
    lastProcessed: string;
    /** Number of technologies detected */
    technologiesDetected?: number;
    /** Whether entity creation succeeded */
    success: boolean;
  };
  /** Additional session metadata */
  metadata?: {
    /** User agent or source */
    source?: string;
    /** Project context when session started */
    projectId?: string;
    /** Any other session-specific data */
    [key: string]: unknown;
  };
}