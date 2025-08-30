/**
 * TemporalBridge Memory Tools
 * Structured functions for memory search and retrieval via MCP
 */

import { Injectable } from '@nestjs/common';
import { detectProject } from './project-detector';
import { listProjectEntities, ensureProjectEntity } from './project-entities';
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
  constructor(private readonly zepService: ZepService) {
  }

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
  async searchFacts(
    query: string,
    limit = 5,
    minRating?: number,
    reranker?: Reranker,
  ): Promise<FactResult[]> {
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
      // Enhance query with project filter if provided
      const enhancedQuery = projectFilter ? `${query} ${projectFilter}` : query;

      const searchResults = await this.zepService.graph.search({
        userId: this.zepService.userId,
        query: enhancedQuery,
        scope,
        limit,
        reranker: reranker === 'none' ? undefined : reranker,
      });

      const results: MemorySearchResult[] = [];

      // Process different result types
      if (scope === 'edges' && searchResults?.edges) {
        for (const edge of searchResults.edges) {
          results.push({
            content: edge.fact || 'Edge relation',
            score: edge.score ?? 0,
            type: 'edge',
            created_at: edge.createdAt,
            metadata: {
              scope,
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
      } else if (scope === 'nodes' && searchResults?.nodes) {
        for (const node of searchResults.nodes) {
          results.push({
            content: node.summary || node.name || 'Node',
            score: node.score ?? 0,
            type: 'node',
            created_at: node.createdAt,
            metadata: {
              scope,
              uuid: node.uuid,
              project_filtered: !!projectFilter,
              project_filter: projectFilter,
              name: node.name,
              labels: node.labels,
              attributes: node.attributes,
            },
          });
        }
      } else if (scope === 'episodes' && searchResults?.episodes) {
        for (const episode of searchResults.episodes) {
          results.push({
            content: episode.content || 'Episode content',
            score: episode.score ?? 0,
            type: 'episode',
            created_at: episode.createdAt,
            metadata: {
              scope,
              uuid: episode.uuid,
              project_filtered: !!projectFilter,
              project_filter: projectFilter,
              processed: episode.processed,
              role_type: episode.roleType,
              source: episode.source,
              session_id: episode.sessionId,
              thread_id: (episode as { threadId?: string }).threadId,
            },
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Search memory error:', error);
      return [];
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
        const result = await listProjectEntities();
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
        
        const result = await ensureProjectEntity(projectPath, {
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