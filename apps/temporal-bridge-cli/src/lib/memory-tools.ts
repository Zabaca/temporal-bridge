/**
 * TemporalBridge Memory Tools
 * Structured functions for memory search and retrieval via MCP
 */

import { Injectable } from '@nestjs/common';
import { detectProject } from './project-detector';
import { ProjectEntitiesService } from './project-entities';
import type { UnifiedMemoryQuery, UnifiedMemoryResult } from './types';
import { type Reranker, ZepError, ZepService } from './zep-client';

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
  type: 'edge' | 'node' | 'episode';
  created_at?: string;
  metadata: {
    scope: string;
    uuid?: string;
    processed?: boolean;
    [key: string]: unknown;
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
@Injectable()
export class MemoryToolsService {
  constructor(
    private readonly zepService: ZepService,
    private readonly projectEntitiesService: ProjectEntitiesService,
  ) {}

  /**
   * Share knowledge to project group graph
   */
  async shareToProjectGroup(
    message: string,
    projectName?: string,
  ): Promise<{ success: boolean; message: string; graphId?: string }> {
    try {
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        throw new Error('Message is required and cannot be empty');
      }
      if (message.trim().length > 10000) {
        throw new Error('Message is too long (max 10,000 characters)');
      }

      const projectContext = await detectProject();
      if (!projectContext) {
        throw new Error("No project context available. Make sure you're in a project directory.");
      }

      if (projectName && (typeof projectName !== 'string' || !/^[a-zA-Z0-9-_]+$/.test(projectName))) {
        throw new Error('Invalid project name. Must contain only letters, numbers, hyphens, and underscores.');
      }

      const targetGraphId = projectName ? `project-${projectName}` : projectContext.groupId;

      const targetProjectName = projectName || projectContext.projectName;

      await this.ensureProjectGroup(targetGraphId, targetProjectName);

      const timestampedMessage = `[${new Date().toISOString()}] ${message}`;

      await this.addToProjectGroup(targetGraphId, timestampedMessage, {
        sharedBy: this.zepService.userId,
        projectName: projectName || projectContext.projectName,
        timestamp: new Date().toISOString(),
        type: 'shared_knowledge',
      });

      return {
        success: true,
        message: `✅ Knowledge shared to project: ${targetProjectName}\n📝 Message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"\n🔗 Graph ID: ${targetGraphId}\n👤 Shared by: ${this.zepService.userId}`,
        graphId: targetGraphId,
      };
    } catch (error) {
      console.error('❌ Error sharing to project group:', error);
      return {
        success: false,
        message: `❌ Failed to share knowledge: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Search knowledge in project group graph
   */
  async searchProjectGroup(
    query: string,
    projectName?: string,
    scope: 'edges' | 'nodes' | 'episodes' = 'episodes',
    limit = 10,
    reranker: Reranker = 'cross_encoder',
  ): Promise<MemorySearchResult[]> {
    try {
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('Query is required and cannot be empty');
      }

      const projectContext = await detectProject();
      if (!projectContext) {
        throw new Error("No project context available. Make sure you're in a project directory.");
      }

      if (projectName && (typeof projectName !== 'string' || !/^[a-zA-Z0-9-_]+$/.test(projectName))) {
        throw new Error('Invalid project name. Must contain only letters, numbers, hyphens, and underscores.');
      }

      const targetGraphId = projectName ? `project-${projectName}` : projectContext.groupId;

      const searchResults = await this.performMemorySearch(
        query.trim(),
        scope,
        limit,
        reranker,
        undefined, // no project filter for direct project search
        targetGraphId, // use graphId instead of userId
      );

      return this.processSearchResults(searchResults, scope).map((result) => ({
        ...result,
        metadata: {
          ...result.metadata,
          scope: `project_${scope}`, // Mark as project search
          graphId: targetGraphId,
          projectName: projectName || projectContext.projectName,
        },
      }));
    } catch (error) {
      console.error('❌ Error searching project group:', error);
      return [];
    }
  }

  /**
   * Add content to project group graph
   */
  private async addToProjectGroup(graphId: string, content: string, metadata?: Record<string, unknown>): Promise<void> {
    try {
      await this.zepService.graph.add({
        graphId,
        type: 'text',
        data: content,
        sourceDescription: metadata ? JSON.stringify(metadata) : undefined,
      });
    } catch (error) {
      console.error('❌ Error adding to project group:', error);
      throw error;
    }
  }

  /**
   * Ensure project group exists, create if needed
   */
  private async ensureProjectGroup(graphId: string, projectName: string): Promise<void> {
    try {
      await this.zepService.graph.search({
        graphId,
        query: 'test',
        limit: 1,
      });
    } catch (error) {
      // If 404 or similar, group doesn't exist, create it
      const zepError = error as ZepError;
      if (zepError.statusCode === 404) {
        try {
          await this.zepService.graph.create({
            graphId,
            name: projectName,
            description: `Project knowledge graph for ${projectName} created by temporal-bridge`,
          });
          console.log(`✅ Created project group: ${graphId}`);
        } catch (createError) {
          const createZepError = createError as ZepError;
          if (!createZepError.message?.includes('already exists')) {
            throw createError;
          }
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Search for facts and relationships (edges in knowledge graph)
   */
  async searchFacts(query: string, limit = 5, minRating?: number, reranker?: Reranker): Promise<FactResult[]> {
    try {
      const searchResults = await this.zepService.graph.search({
        userId: this.zepService.userId,
        query,
        scope: 'edges',
        limit,
        reranker: reranker === 'none' ? undefined : reranker,
      });

      if (!searchResults?.edges) {
        return [];
      }

      return searchResults.edges
        .filter((edge) => !minRating || (edge.score ?? 0) >= minRating)
        .map((edge) => ({
          fact: edge.fact || 'Unknown fact',
          score: edge.score ?? 0,
          created_at: edge.createdAt,
          valid_at: edge.validAt,
          expired_at: edge.expiredAt,
          source_episodes: edge.episodes || [],
        }));
    } catch (error) {
      console.error('Search facts error:', error);
      return [];
    }
  }

  /**
   * Search memory across different scopes (edges, nodes, episodes) with optional project filtering
   */
  async searchMemory(
    query: string,
    scope: 'edges' | 'nodes' | 'episodes' = 'episodes',
    limit = 5,
    reranker?: Reranker,
    projectFilter?: string,
  ): Promise<MemorySearchResult[]> {
    try {
      const searchResults = await this.performMemorySearch(query, scope, limit, reranker, projectFilter);
      return this.processSearchResults(searchResults, scope, projectFilter);
    } catch (error) {
      console.error('Search memory error:', error);
      return [];
    }
  }

  private async performMemorySearch(
    query: string,
    scope: string,
    limit: number,
    reranker?: Reranker,
    projectFilter?: string,
    graphId?: string,
  ) {
    const enhancedQuery = projectFilter ? `${query} ${projectFilter}` : query;

    const searchParams: {
      query: string;
      scope: 'edges' | 'nodes' | 'episodes';
      limit: number;
      reranker?: string;
      userId?: string;
      graphId?: string;
    } = {
      query: enhancedQuery,
      scope: scope as 'edges' | 'nodes' | 'episodes',
      limit,
      reranker: reranker === 'none' ? undefined : reranker,
    };

    // Use graphId for project searches, userId for personal searches
    if (graphId) {
      searchParams.graphId = graphId;
    } else {
      searchParams.userId = this.zepService.userId;
    }

    return await this.zepService.graph.search(searchParams as any);
  }

  private processSearchResults(searchResults: unknown, scope: string, projectFilter?: string): MemorySearchResult[] {
    const results: MemorySearchResult[] = [];

    if (scope === 'edges') {
      this.processEdgeResults(searchResults, results, projectFilter);
    } else if (scope === 'nodes') {
      this.processNodeResults(searchResults, results, projectFilter);
    } else if (scope === 'episodes') {
      this.processEpisodeResults(searchResults, results, projectFilter);
    }

    return results;
  }

  private processEdgeResults(searchResults: unknown, results: MemorySearchResult[], projectFilter?: string) {
    const typedResults = searchResults as {
      edges?: {
        fact?: string;
        score?: number;
        createdAt?: string;
        uuid?: string;
        validAt?: string;
        expiredAt?: string;
        sourceNodeUuid?: string;
        targetNodeUuid?: string;
        episodes?: unknown;
      }[];
    };

    if (typedResults?.edges) {
      for (const edge of typedResults.edges) {
        results.push({
          content: edge.fact || 'Edge relation',
          score: edge.score ?? 0,
          type: 'edge',
          created_at: edge.createdAt,
          metadata: {
            scope: 'edges',
            uuid: edge.uuid,
            project_filtered: !!projectFilter,
            project_filter: projectFilter,
            valid_at: edge.validAt,
            expired_at: edge.expiredAt,
            source_node: edge.sourceNodeUuid,
            target_node: edge.targetNodeUuid,
            episodes: edge.episodes,
          },
        });
      }
    }
  }

  private processNodeResults(searchResults: unknown, results: MemorySearchResult[], projectFilter?: string) {
    const typedResults = searchResults as {
      nodes?: {
        summary?: string;
        name?: string;
        score?: number;
        createdAt?: string;
        uuid?: string;
        labels?: unknown;
        attributes?: unknown;
      }[];
    };

    if (typedResults?.nodes) {
      for (const node of typedResults.nodes) {
        results.push({
          content: node.summary || node.name || 'Node',
          score: node.score ?? 0,
          type: 'node',
          created_at: node.createdAt,
          metadata: {
            scope: 'nodes',
            uuid: node.uuid,
            project_filtered: !!projectFilter,
            project_filter: projectFilter,
            name: node.name,
            labels: node.labels,
            attributes: node.attributes,
          },
        });
      }
    }
  }

  private processEpisodeResults(searchResults: unknown, results: MemorySearchResult[], projectFilter?: string) {
    const typedResults = searchResults as {
      episodes?: {
        content?: string;
        score?: number;
        createdAt?: string;
        uuid?: string;
        processed?: boolean;
        roleType?: string;
        source?: string;
        sessionId?: string;
        threadId?: string;
      }[];
    };

    if (typedResults?.episodes) {
      for (const episode of typedResults.episodes) {
        results.push({
          content: episode.content || 'Episode content',
          score: episode.score ?? 0,
          type: 'episode',
          created_at: episode.createdAt,
          metadata: {
            scope: 'episodes',
            uuid: episode.uuid,
            project_filtered: !!projectFilter,
            project_filter: projectFilter,
            processed: episode.processed,
            role_type: episode.roleType,
            source: episode.source,
            session_id: episode.sessionId,
            thread_id: episode.threadId,
          },
        });
      }
    }
  }

  /**
   * Comprehensive search method that supports all CLI use cases
   */
  async retrieveMemory(options: UnifiedMemoryQuery = {}): Promise<UnifiedMemoryResult[]> {
    const results: UnifiedMemoryResult[] = [];

    try {
      // Handle debug commands
      if (options.debugListProjects) {
        console.log('🔍 DEBUG: Testing listProjectEntities() API call\n');
        const result = await this.projectEntitiesService.listProjectEntities();
        console.log('Raw API Response:', JSON.stringify(result, null, 2));
        return [];
      }

      if (options.debugPortfolio) {
        console.log('🔍 DEBUG: Testing portfolio functionality\n');
        console.log('Portfolio debug functionality not yet implemented');
        return [];
      }

      if (options.debugCreateEntity) {
        console.log('🔍 DEBUG: Creating test project entity\n');
        const projectPath = process.cwd();
        console.log(`Creating entity for project path: ${projectPath}`);

        const result = await this.projectEntitiesService.ensureProjectEntity(projectPath, {
          forceUpdate: true,
          skipTechDetection: false,
        });

        console.log('Entity Creation Result:', JSON.stringify(result, null, 2));
        return [];
      }

      // Handle query-based search using the existing searchMemory method
      if (options.query) {
        const searchResults = await this.searchMemory(
          options.query,
          options.searchScope || 'episodes',
          options.limit || 10,
          options.reranker,
        );

        for (const result of searchResults) {
          results.push({
            content: result.content,
            score: result.score,
            timestamp: result.created_at,
            type: 'graph_search',
            metadata: {
              ...result.metadata,
              search_scope: options.searchScope || 'episodes',
            },
          });
        }
      }

      // Handle thread context retrieval - simplified for now
      if (options.threadId) {
        results.push({
          content: `Thread context for ${options.threadId} - functionality to be implemented`,
          type: 'user_context',
          metadata: {
            thread_id: options.threadId,
          },
        });
      }

      // Handle recent episodes - simplified for now
      if (!(options.query || options.threadId)) {
        results.push({
          content: 'Recent episodes - functionality to be implemented',
          type: 'recent_episodes',
          metadata: {
            scope: 'recent',
          },
        });
      }

      return results;
    } catch (error) {
      console.error('❌ Error retrieving memory:', error);
      throw error;
    }
  }
}
