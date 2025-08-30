import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import { MemoryToolsService, ProjectEntitiesService } from '../lib';

@Injectable()
export class TemporalBridgeToolsService {
  constructor(
    private readonly memoryTools: MemoryToolsService,
    private readonly projectEntities: ProjectEntitiesService,
  ) {}

  @Tool({
    name: 'search_personal',
    description: 'Search your personal conversation history only',
    parameters: z.object({
      query: z.string().describe('Search query to search personal memories'),
      limit: z.number().optional().default(5).describe('Number of results to return'),
      reranker: z
        .enum(['cross_encoder', 'none'])
        .optional()
        .default('cross_encoder')
        .describe('Reranker type for better accuracy'),
    }),
  })
  async searchPersonal(input: { query: string; limit?: number; reranker?: 'cross_encoder' | 'none' }) {
    const results = await this.memoryTools.searchMemory(input.query, 'episodes', input.limit || 5, input.reranker);

    return {
      source: 'personal',
      query: input.query,
      results: results.map((r) => ({
        content: r.content,
        score: r.score,
        type: r.type,
        timestamp: r.created_at,
        metadata: { ...r.metadata, scope: 'personal' },
      })),
    };
  }

  @Tool({
    name: 'search_project',
    description: 'Search shared project knowledge only',
    parameters: z.object({
      query: z.string().describe('Search query for project-specific knowledge'),
      project: z.string().optional().describe('Project name for group graph (defaults to current project)'),
      limit: z.number().optional().default(5).describe('Number of results to return'),
      reranker: z
        .enum(['cross_encoder', 'none'])
        .optional()
        .default('cross_encoder')
        .describe('Reranker type for better accuracy'),
    }),
  })
  async searchProject(input: { query: string; project?: string; limit?: number; reranker?: 'cross_encoder' | 'none' }) {
    // TODO: Implement project-specific search when project groups are set up
    return {
      source: 'project',
      query: input.query,
      project: input.project || 'current',
      results: [],
      message: 'Project search functionality will be implemented with project groups',
    };
  }

  @Tool({
    name: 'search_all',
    description: 'Search both personal and project memories with source labels',
    parameters: z.object({
      query: z.string().describe('Search query to search across all available memories'),
      project: z.string().optional().describe('Project name for group graph (defaults to current project)'),
      limit: z.number().optional().default(5).describe('Number of results per source'),
      reranker: z
        .enum(['cross_encoder', 'none'])
        .optional()
        .default('cross_encoder')
        .describe('Reranker type for better accuracy'),
    }),
  })
  async searchAll(input: { query: string; project?: string; limit?: number; reranker?: 'cross_encoder' | 'none' }) {
    const personalResults = await this.searchPersonal({
      query: input.query,
      limit: input.limit,
      reranker: input.reranker,
    });

    const projectResults = await this.searchProject({
      query: input.query,
      project: input.project,
      limit: input.limit,
      reranker: input.reranker,
    });

    return {
      query: input.query,
      project: input.project || 'current',
      personal: personalResults.results,
      project_results: projectResults.results,
    };
  }

  @Tool({
    name: 'get_recent_episodes',
    description: 'Get recent conversation episodes for context building',
    parameters: z.object({
      limit: z.number().optional().default(10).describe('Number of recent episodes to return'),
    }),
  })
  async getRecentEpisodes(input: { limit?: number }) {
    const results = await this.memoryTools.searchMemory(
      '*', // Search all
      'episodes',
      input.limit || 10,
    );

    return {
      episodes: results.map((r) => ({
        content: r.content,
        score: r.score,
        timestamp: r.created_at,
        metadata: r.metadata,
      })),
      count: results.length,
    };
  }

  @Tool({
    name: 'get_current_context',
    description: 'Get memory context for current Claude Code session',
    parameters: z.object({}),
  })
  async getCurrentContext() {
    const projectContext = await this.projectEntities.getCurrentProjectContext();

    return {
      success: projectContext.success,
      project: projectContext.project,
      error: projectContext.error,
      timestamp: new Date().toISOString(),
    };
  }

  @Tool({
    name: 'share_knowledge',
    description: 'Share knowledge to project group graph for team collaboration',
    parameters: z.object({
      message: z.string().min(1).max(10000).describe('The knowledge to share (insights, decisions, learnings, etc.)'),
      project: z.string().optional().describe('Target project name (defaults to current project)'),
    }),
  })
  async shareKnowledge(input: { message: string; project?: string }) {
    const result = await this.memoryTools.shareToProjectGroup(input.message, input.project);

    return {
      success: result.success,
      message: result.message,
      graphId: result.graphId,
    };
  }

  @Tool({
    name: 'list_projects',
    description: 'List all projects you have worked on with metadata',
    parameters: z.object({}),
  })
  async listProjects() {
    const result = await this.projectEntities.listProjectEntities();

    return {
      success: result.success,
      projects: result.projects || [],
      count: result.count || 0,
      error: result.error,
    };
  }

  @Tool({
    name: 'project_context',
    description: 'Get current project context and entity information',
    parameters: z.object({}),
  })
  async projectContext() {
    return await this.getCurrentContext();
  }

  @Tool({
    name: 'project_technologies',
    description: 'Get detailed technology breakdown for specific projects',
    parameters: z.object({
      projectId: z.string().describe('Project ID to get technology information for'),
    }),
  })
  async projectTechnologies(input: { projectId: string }) {
    const result = await this.projectEntities.getProjectEntity(input.projectId);

    return {
      success: result.success,
      projectId: input.projectId,
      technologies: result.technologies || [],
      entity: result.entity,
      error: result.error,
    };
  }

  @Tool({
    name: 'get_technology_expertise',
    description: 'Analyze technology expertise across all projects',
    parameters: z.object({
      technology: z.string().optional().describe('Specific technology to analyze (returns all if not specified)'),
    }),
  })
  async getTechnologyExpertise(input: { technology?: string }) {
    const projectsResult = await this.projectEntities.listProjectEntities();

    if (!(projectsResult.success && projectsResult.projects)) {
      return {
        success: false,
        error: projectsResult.error || 'Failed to retrieve projects',
      };
    }

    const expertise: Record<string, { count: number; projects: string[]; avgConfidence?: number }> = {};

    for (const project of projectsResult.projects) {
      const projectData = project as any;
      const technologies = projectData.attributes?.technologies;

      if (typeof technologies === 'string') {
        const techList = technologies.split(', ');
        for (const tech of techList) {
          if (!input.technology || tech === input.technology) {
            if (!expertise[tech]) {
              expertise[tech] = { count: 0, projects: [] };
            }
            expertise[tech].count++;
            expertise[tech].projects.push(projectData.name || 'Unknown');
          }
        }
      }
    }

    return {
      success: true,
      technology: input.technology,
      expertise,
      totalProjects: projectsResult.count,
    };
  }

  @Tool({
    name: 'get_thread_context',
    description: 'Get comprehensive context summary for a specific Claude Code conversation thread',
    parameters: z.object({
      thread_id: z.string().describe('Claude Code thread ID (format: claude-code-session-id)'),
      min_rating: z.number().optional().describe('Minimum fact confidence rating 0-1'),
    }),
  })
  async getThreadContext(input: { thread_id: string; min_rating?: number }) {
    // TODO: Implement thread context retrieval when Zep thread API is integrated
    return {
      thread_id: input.thread_id,
      context_summary: 'Thread context functionality will be implemented with Zep thread integration',
      facts: [],
      user_id: 'developer',
      message: 'Thread context retrieval not yet implemented',
    };
  }
}
