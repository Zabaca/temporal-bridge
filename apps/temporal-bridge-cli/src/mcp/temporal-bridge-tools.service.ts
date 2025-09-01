import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import { MemoryToolsService, ProjectEntitiesService, Zep, ZepService } from '../lib';

@Injectable()
export class TemporalBridgeToolsService {
  constructor(
    private readonly memoryTools: MemoryToolsService,
    private readonly projectEntities: ProjectEntitiesService,
    private readonly zepService: ZepService,
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
    try {
      const results = await this.memoryTools.searchProjectGroup(
        input.query,
        input.project,
        'episodes', // Default to episodes for better results
        input.limit || 5,
        input.reranker === 'none' ? undefined : input.reranker || Zep.Reranker.CrossEncoder,
      );

      return {
        source: 'project',
        query: input.query,
        project: input.project || 'current',
        results: results
          ? results.map((r) => ({
              content: r.content,
              score: r.score,
              timestamp: r.created_at,
              type: r.type,
              metadata: r.metadata,
            }))
          : [],
      };
    } catch (error) {
      console.error('❌ Error searching project:', error);
      return {
        source: 'project',
        query: input.query,
        project: input.project || 'current',
        results: [],
        error: `Failed to search project: ${(error as Error).message}`,
      };
    }
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

    const expertise = this.buildTechnologyExpertise(projectsResult.projects, input.technology);

    return {
      success: true,
      technology: input.technology,
      expertise,
      totalProjects: projectsResult.count,
    };
  }

  private buildTechnologyExpertise(
    projects: unknown[],
    targetTechnology?: string,
  ): Record<string, { count: number; projects: string[]; avgConfidence?: number }> {
    const expertise: Record<string, { count: number; projects: string[]; avgConfidence?: number }> = {};

    for (const project of projects) {
      this.processProjectTechnologies(project, expertise, targetTechnology);
    }

    return expertise;
  }

  private processProjectTechnologies(
    project: unknown,
    expertise: Record<string, { count: number; projects: string[]; avgConfidence?: number }>,
    targetTechnology?: string,
  ) {
    const projectData = project as { attributes?: { technologies?: string | Record<string, number> }; name?: string };
    const technologies = projectData.attributes?.technologies;

    if (typeof technologies === 'string') {
      const techList = technologies.split(', ');
      for (const tech of techList) {
        if (this.shouldIncludeTechnology(tech, targetTechnology)) {
          this.updateTechnologyExpertise(tech, projectData.name || 'Unknown', expertise);
        }
      }
    }
  }

  private shouldIncludeTechnology(tech: string, targetTechnology?: string): boolean {
    return !targetTechnology || tech === targetTechnology;
  }

  private updateTechnologyExpertise(
    tech: string,
    projectName: string,
    expertise: Record<string, { count: number; projects: string[]; avgConfidence?: number }>,
  ) {
    if (!expertise[tech]) {
      expertise[tech] = { count: 0, projects: [] };
    }
    expertise[tech].count++;
    expertise[tech].projects.push(projectName);
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
    try {
      // Ensure user and thread exist in Zep
      await this.zepService.ensureUser();
      await this.zepService.ensureThread(input.thread_id);

      // Get Zep's intelligent context block for this thread
      // Use mode: "basic" to get structured FACTS and ENTITIES format
      const threadContext = await this.zepService.thread.getUserContext(input.thread_id, {
        mode: 'basic', // Get structured FACTS/ENTITIES format, not summary
      });

      // The context block contains structured FACTS and ENTITIES
      const contextBlock = threadContext?.context || 'No context available for this thread';

      return {
        thread_id: input.thread_id,
        context_block: contextBlock, // Full structured context with FACTS/ENTITIES/EPISODES
        user_id: this.zepService.userId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Error getting thread context:', error);
      return {
        thread_id: input.thread_id,
        context_block: 'Error retrieving thread context',
        user_id: this.zepService.userId,
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Tool({
    name: 'list_entity_types',
    description: 'List all entity types available in Zep knowledge graphs',
    parameters: z.object({}),
  })
  async listEntityTypes() {
    try {
      await this.zepService.ensureUser();
      const entityTypes = await this.zepService.graph.listEntityTypes();

      return {
        entity_types: entityTypes,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error listing entity types:', error);
      throw new Error(`Failed to list entity types: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Tool({
    name: 'ingest_documentation',
    description: 'Ingest documentation files into the knowledge graph for automatic entity extraction',
    parameters: z.object({
      file_path: z.string().describe('Path to the documentation file to ingest'),
      content: z.string().describe('Content of the documentation file (with frontmatter)'),
      project: z.string().optional().describe('Target project name (defaults to current project)'),
    }),
  })
  async ingestDocumentation(input: { file_path: string; content: string; project?: string }) {
    try {
      // Validate inputs
      if (!(input.file_path && input.content)) {
        throw new Error('Both file_path and content are required');
      }

      if (input.content.length > 10000) {
        throw new Error('Document content is too large (max 10,000 characters). Consider chunking large documents.');
      }

      // Use existing shareToProjectGroup infrastructure but for documentation
      const result = await this.memoryTools.shareToProjectGroup(
        `[DOCUMENTATION] ${input.file_path}\n\n${input.content}`,
        input.project,
      );

      return {
        success: result.success,
        message: `✅ Documentation ingested successfully\n📄 File: ${input.file_path}\n🤖 Zep will automatically extract entities based on the custom ontology\n🔗 Graph ID: ${result.graphId}`,
        file_path: input.file_path,
        graph_id: result.graphId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Error ingesting documentation:', error);
      return {
        success: false,
        error: `Failed to ingest documentation: ${(error as Error).message}`,
        file_path: input.file_path,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Tool({
    name: 'find_component_docs',
    description: 'Find all documentation for a specific architectural component',
    parameters: z.object({
      component_name: z.string().describe('Name of the component to find documentation for'),
      project: z.string().optional().describe('Target project name (defaults to current project)'),
      limit: z.number().optional().default(10).describe('Maximum number of results to return'),
    }),
  })
  async findComponentDocs(input: { component_name: string; project?: string; limit?: number }) {
    try {
      const searchQuery = `Architecture component ${input.component_name} documentation implementation`;
      const results = await this.memoryTools.searchProjectGroup(
        searchQuery,
        input.project,
        'episodes',
        input.limit || 10,
        Zep.Reranker.CrossEncoder,
      );

      return {
        success: true,
        component: input.component_name,
        project: input.project || 'current',
        documentation: results
          ? results.map((r) => ({
              content: r.content,
              score: r.score,
              timestamp: r.created_at,
              metadata: r.metadata,
            }))
          : [],
        count: results?.length || 0,
      };
    } catch (error) {
      console.error('❌ Error finding component documentation:', error);
      return {
        success: false,
        component: input.component_name,
        project: input.project || 'current',
        error: `Failed to find component documentation: ${(error as Error).message}`,
        documentation: [],
        count: 0,
      };
    }
  }

  @Tool({
    name: 'get_architecture_overview',
    description: 'Get high-level architecture overview and system design documentation',
    parameters: z.object({
      project: z.string().optional().describe('Target project name (defaults to current project)'),
      c4_layer: z.enum(['context', 'container', 'component', 'code']).optional().describe('Specific C4 layer to focus on'),
    }),
  })
  async getArchitectureOverview(input: { project?: string; c4_layer?: 'context' | 'container' | 'component' | 'code' }) {
    try {
      const layerQuery = input.c4_layer ? `C4 ${input.c4_layer} layer` : 'architecture overview system design';
      const searchQuery = `${layerQuery} TemporalBridge architecture system context`;
      
      const results = await this.memoryTools.searchProjectGroup(
        searchQuery,
        input.project,
        'episodes',
        10,
        Zep.Reranker.CrossEncoder,
      );

      return {
        success: true,
        project: input.project || 'current',
        c4_layer: input.c4_layer || 'all',
        overview: results
          ? results.map((r) => ({
              content: r.content,
              score: r.score,
              timestamp: r.created_at,
              metadata: r.metadata,
            }))
          : [],
        count: results?.length || 0,
      };
    } catch (error) {
      console.error('❌ Error getting architecture overview:', error);
      return {
        success: false,
        project: input.project || 'current',
        c4_layer: input.c4_layer || 'all',
        error: `Failed to get architecture overview: ${(error as Error).message}`,
        overview: [],
        count: 0,
      };
    }
  }

  @Tool({
    name: 'find_architecture_decisions',
    description: 'Find Architecture Decision Records (ADRs) and related implementation details',
    parameters: z.object({
      decision_topic: z.string().optional().describe('Specific decision topic to search for'),
      status: z.enum(['proposed', 'accepted', 'deprecated', 'superseded']).optional().describe('Filter by decision status'),
      project: z.string().optional().describe('Target project name (defaults to current project)'),
      limit: z.number().optional().default(5).describe('Maximum number of results to return'),
    }),
  })
  async findArchitectureDecisions(input: {
    decision_topic?: string;
    status?: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
    project?: string;
    limit?: number;
  }) {
    try {
      const topicQuery = input.decision_topic || 'architecture decision';
      const statusFilter = input.status ? `status ${input.status}` : '';
      const searchQuery = `ArchitectureDecision ADR ${topicQuery} ${statusFilter} architectural choice`.trim();

      const results = await this.memoryTools.searchProjectGroup(
        searchQuery,
        input.project,
        'episodes',
        input.limit || 5,
        Zep.Reranker.CrossEncoder,
      );

      return {
        success: true,
        decision_topic: input.decision_topic || 'all',
        status: input.status || 'any',
        project: input.project || 'current',
        decisions: results
          ? results.map((r) => ({
              content: r.content,
              score: r.score,
              timestamp: r.created_at,
              metadata: r.metadata,
            }))
          : [],
        count: results?.length || 0,
      };
    } catch (error) {
      console.error('❌ Error finding architecture decisions:', error);
      return {
        success: false,
        decision_topic: input.decision_topic || 'all',
        status: input.status || 'any',
        project: input.project || 'current',
        error: `Failed to find architecture decisions: ${(error as Error).message}`,
        decisions: [],
        count: 0,
      };
    }
  }

  @Tool({
    name: 'search_data_models',
    description: 'Search for data model definitions, schemas, and related documentation',
    parameters: z.object({
      model_name: z.string().optional().describe('Specific data model name to search for'),
      storage_layer: z.enum(['postgres', 'redis', 'zep', 'memory', 'file', 'api']).optional().describe('Filter by storage layer'),
      project: z.string().optional().describe('Target project name (defaults to current project)'),
      limit: z.number().optional().default(5).describe('Maximum number of results to return'),
    }),
  })
  async searchDataModels(input: {
    model_name?: string;
    storage_layer?: 'postgres' | 'redis' | 'zep' | 'memory' | 'file' | 'api';
    project?: string;
    limit?: number;
  }) {
    try {
      const modelQuery = input.model_name || 'DataModel';
      const storageFilter = input.storage_layer ? `${input.storage_layer} storage` : '';
      const searchQuery = `${modelQuery} schema definition interface ${storageFilter} data structure`.trim();

      const results = await this.memoryTools.searchProjectGroup(
        searchQuery,
        input.project,
        'episodes',
        input.limit || 5,
        Zep.Reranker.CrossEncoder,
      );

      return {
        success: true,
        model_name: input.model_name || 'all',
        storage_layer: input.storage_layer || 'any',
        project: input.project || 'current',
        models: results
          ? results.map((r) => ({
              content: r.content,
              score: r.score,
              timestamp: r.created_at,
              metadata: r.metadata,
            }))
          : [],
        count: results?.length || 0,
      };
    } catch (error) {
      console.error('❌ Error searching data models:', error);
      return {
        success: false,
        model_name: input.model_name || 'all',
        storage_layer: input.storage_layer || 'any',
        project: input.project || 'current',
        error: `Failed to search data models: ${(error as Error).message}`,
        models: [],
        count: 0,
      };
    }
  }

  @Tool({
    name: 'trace_component_dependencies',
    description: 'Trace dependencies and relationships between architectural components',
    parameters: z.object({
      component_name: z.string().describe('Component to trace dependencies for'),
      direction: z.enum(['depends_on', 'depended_by', 'both']).optional().default('both').describe('Direction of dependencies to trace'),
      project: z.string().optional().describe('Target project name (defaults to current project)'),
    }),
  })
  async traceComponentDependencies(input: {
    component_name: string;
    direction?: 'depends_on' | 'depended_by' | 'both';
    project?: string;
  }) {
    try {
      let searchQuery = '';
      switch (input.direction) {
        case 'depends_on':
          searchQuery = `${input.component_name} depends on dependency requires`;
          break;
        case 'depended_by':
          searchQuery = `dependency ${input.component_name} used by required by`;
          break;
        default:
          searchQuery = `${input.component_name} dependency relationship depends uses`;
      }

      const results = await this.memoryTools.searchProjectGroup(
        searchQuery,
        input.project,
        'episodes',
        10,
        Zep.Reranker.CrossEncoder,
      );

      return {
        success: true,
        component: input.component_name,
        direction: input.direction || 'both',
        project: input.project || 'current',
        dependencies: results
          ? results.map((r) => ({
              content: r.content,
              score: r.score,
              timestamp: r.created_at,
              metadata: r.metadata,
            }))
          : [],
        count: results?.length || 0,
      };
    } catch (error) {
      console.error('❌ Error tracing component dependencies:', error);
      return {
        success: false,
        component: input.component_name,
        direction: input.direction || 'both',
        project: input.project || 'current',
        error: `Failed to trace component dependencies: ${(error as Error).message}`,
        dependencies: [],
        count: 0,
      };
    }
  }
}
