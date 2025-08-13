/**
 * TemporalBridge Memory Tools
 * Structured functions for memory search and retrieval via MCP
 */

import { createZepClient, getDefaultConfig } from "./zep-client.ts";
import type { MemoryResult } from "./types.ts";

export interface FactResult {
  fact: string;
  score: number;
  created_at: string;
  valid_at?: string;
  expired_at?: string;
  source_episodes: string[];
}

export interface MemorySearchResult {
  content: string;
  score: number;
  type: "edge" | "node" | "episode";
  created_at?: string;
  metadata: {
    scope: string;
    uuid?: string;
    processed?: boolean;
    [key: string]: any;
  };
}

export interface ThreadContextResult {
  context_summary: string;
  facts: FactResult[];
  thread_id: string;
  user_id: string;
}

/**
 * Search for facts and relationships (edges in knowledge graph)
 */
export async function searchFacts(
  query: string, 
  limit = 5, 
  minRating?: number,
  reranker: 'cross_encoder' | 'none' = 'cross_encoder'
): Promise<FactResult[]> {
  const config = getDefaultConfig();
  const client = createZepClient();
  
  try {
    const searchResults = await client.graph.search({
      userId: config.userId || "developer",
      query,
      scope: 'edges',
      limit,
      reranker: reranker as any
    });

    if (!searchResults?.edges) {
      return [];
    }

    return searchResults.edges
      .filter(edge => !minRating || (edge.score ?? 0) >= minRating)
      .map(edge => ({
        fact: edge.fact || "Unknown fact",
        score: edge.score ?? 0,
        created_at: edge.createdAt,
        valid_at: edge.validAt,
        expired_at: edge.expiredAt,
        source_episodes: edge.episodes || []
      }));
  } catch (error) {
    console.error("Search facts error:", error);
    return [];
  }
}

/**
 * Search memory across different scopes (edges, nodes, episodes)
 */
export async function searchMemory(
  query: string, 
  scope: "edges" | "nodes" | "episodes" = "episodes", 
  limit = 5,
  reranker: 'cross_encoder' | 'none' = 'cross_encoder'
): Promise<MemorySearchResult[]> {
  const config = getDefaultConfig();
  const client = createZepClient();
  
  try {
    const searchResults = await client.graph.search({
      userId: config.userId || "developer",
      query,
      scope: scope as any,
      limit,
      reranker: reranker as any
    });

    const results: MemorySearchResult[] = [];

    // Process different result types
    if (scope === 'edges' && searchResults?.edges) {
      for (const edge of searchResults.edges) {
        results.push({
          content: edge.fact || "Edge relation",
          score: edge.score ?? 0,
          type: "edge",
          created_at: edge.createdAt,
          metadata: {
            scope,
            uuid: edge.uuid,
            valid_at: edge.validAt,
            expired_at: edge.expiredAt,
            source_node: edge.sourceNodeUuid,
            target_node: edge.targetNodeUuid,
            episodes: edge.episodes
          }
        });
      }
    } else if (scope === 'nodes' && searchResults?.nodes) {
      for (const node of searchResults.nodes) {
        results.push({
          content: node.summary || node.name || "Node",
          score: node.score ?? 0,
          type: "node",
          created_at: node.createdAt,
          metadata: {
            scope,
            uuid: node.uuid,
            name: node.name,
            labels: node.labels,
            attributes: node.attributes
          }
        });
      }
    } else if (scope === 'episodes' && searchResults?.episodes) {
      for (const episode of searchResults.episodes) {
        results.push({
          content: episode.content || "Episode content",
          score: episode.score ?? 0,
          type: "episode", 
          created_at: episode.createdAt,
          metadata: {
            scope,
            uuid: episode.uuid,
            processed: episode.processed,
            role_type: episode.roleType,
            source: episode.source,
            session_id: episode.sessionId,
            thread_id: (episode as any).threadId
          }
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Search memory error:", error);
    return [];
  }
}

/**
 * Get comprehensive context for a specific thread
 */
export async function getThreadContext(
  threadId: string, 
  minRating?: number
): Promise<ThreadContextResult> {
  const config = getDefaultConfig();
  const client = createZepClient();
  
  try {
    // Get user context for the thread
    const userContext = await client.thread.getUserContext(threadId, {
      minRating
    });

    // Extract facts if available
    const facts: FactResult[] = [];
    if ((userContext as any).facts) {
      for (const fact of (userContext as any).facts) {
        facts.push({
          fact: fact.fact || "Unknown fact",
          score: fact.rating || 0,
          created_at: fact.created_at || new Date().toISOString(),
          valid_at: fact.valid_at,
          expired_at: fact.expired_at,
          source_episodes: fact.episodes || []
        });
      }
    }

    return {
      context_summary: userContext.context || "No context available",
      facts,
      thread_id: threadId,
      user_id: config.userId || "developer"
    };
  } catch (error) {
    console.error("Get thread context error:", error);
    return {
      context_summary: `Error retrieving context: ${(error as any).message}`,
      facts: [],
      thread_id: threadId,
      user_id: config.userId || "developer"
    };
  }
}

/**
 * Get recent episodes for context building
 */
export async function getRecentEpisodes(limit = 10): Promise<MemorySearchResult[]> {
  const config = getDefaultConfig();
  const client = createZepClient();
  
  try {
    const episodeResponse = await client.graph.episode.getByUserId(
      config.userId || "developer", 
      { lastn: limit }
    );

    if (!episodeResponse?.episodes) {
      return [];
    }

    return episodeResponse.episodes.map(episode => ({
      content: episode.content || "Episode content",
      score: 1.0, // Recent episodes get full score
      type: "episode" as const,
      created_at: episode.createdAt,
      metadata: {
        scope: "episodes",
        uuid: episode.uuid,
        processed: episode.processed,
        role_type: episode.roleType,
        source: episode.source,
        session_id: episode.sessionId,
        thread_id: (episode as any).threadId
      }
    }));
  } catch (error) {
    console.error("Get recent episodes error:", error);
    return [];
  }
}

export interface UnifiedMemoryQuery {
  query?: string;
  threadId?: string;
  userId?: string;
  limit?: number;
  searchScope?: "edges" | "nodes" | "episodes";
  minRating?: number;
  reranker?: 'cross_encoder' | 'none';
}

export interface UnifiedMemoryResult {
  content: string;
  score?: number;
  timestamp?: string;
  type: 'graph_search' | 'user_context' | 'recent_episodes';
  metadata: {
    scope?: string;
    thread_id?: string;
    episode_id?: string;
    source?: string;
    processed?: boolean;
    status?: string;
    role?: string;
    facts?: any[];
    recent_messages?: any[];
    [key: string]: any;
  };
}

/**
 * Unified memory retrieval function that handles all search patterns
 */
export async function retrieveMemory(options: UnifiedMemoryQuery = {}): Promise<UnifiedMemoryResult[]> {
  const config = getDefaultConfig();
  const userId = options.userId || config.userId || "developer";
  const results: UnifiedMemoryResult[] = [];
  
  try {
    // Handle query-based search
    if (options.query) {
      const searchResults = await searchMemory(
        options.query,
        options.searchScope || "edges",
        options.limit || 10,
        options.reranker || "cross_encoder"
      );
      
      for (const result of searchResults) {
        results.push({
          content: result.content,
          score: result.score,
          timestamp: result.created_at,
          type: 'graph_search',
          metadata: {
            ...result.metadata,
            search_scope: options.searchScope || "edges"
          }
        });
      }
    }

    // Handle thread context retrieval
    if (options.threadId) {
      const context = await getThreadContext(options.threadId, options.minRating);
      
      results.push({
        content: context.context_summary,
        type: 'user_context',
        metadata: {
          thread_id: options.threadId,
          facts: context.facts,
          user_id: context.user_id
        }
      });
    }

    // Handle recent episodes (default when no query or thread)
    if (!options.query && !options.threadId) {
      const episodes = await getRecentEpisodes(options.limit || 20);
      
      for (const episode of episodes) {
        results.push({
          content: episode.content,
          score: episode.score,
          timestamp: episode.created_at,
          type: 'recent_episodes',
          metadata: {
            episode_id: episode.metadata.uuid,
            source: episode.metadata.source || 'Message',
            processed: episode.metadata.processed,
            status: episode.metadata.processed ? 'Processed' : 'Pending',
            role: episode.metadata.role_type,
            ...episode.metadata
          }
        });
      }
    }

    return results;

  } catch (error) {
    console.error("❌ Error retrieving memory:", error);
    throw error;
  }
}