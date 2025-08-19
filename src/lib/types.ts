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