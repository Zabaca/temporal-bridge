import { Injectable } from '@nestjs/common';
import { detectProject, detectProjectTechnologies } from './project-detector';
import type { ProjectContext } from './project-detector';
import type {
  EntityCreationOptions,
  ProjectEntity,
  ProjectEntityProperties,
  ProjectRelationship,
  TechnologyDetectionResult,
} from './types';
import { ZepClient, createZepClient, getDefaultConfigAsync } from './zep-client';

interface ZepNode {
  name: string;
  attributes?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  uuid?: string;
  labels?: string[];
  summary?: string;
}

export interface EntityCreationResult {
  success: boolean;
  projectEntity?: ProjectEntity;
  relationships?: ProjectRelationship[];
  technologiesDetected?: number;
  detectedTechnologies?: Array<{
    name: string;
    confidence: number;
    source: string;
    version?: string;
    context?: string;
  }>;
  message?: string;
  error?: string;
}

@Injectable()
export class ProjectEntitiesService {
  /**
   * Create or update a Project entity in Zep's knowledge graph
   */
  async ensureProjectEntity(projectPath: string, options: EntityCreationOptions = {}): Promise<EntityCreationResult> {
    try {
      const client = createZepClient();
      const config = await getDefaultConfigAsync();
      const userId = config.userId || 'developer';

      const projectContext = await detectProject(projectPath);

      const techDetection = await this.detectTechnologies(client, userId, projectContext, options);

      const entityProperties = this.createEntityProperties(projectContext, techDetection);
      const projectEntity = this.createProjectEntity(projectContext, entityProperties);

      const entities = this.prepareEntitiesForZep(projectEntity, techDetection, projectContext);
      const relationships = this.prepareRelationshipsForZep(userId, projectContext, techDetection);

      await this.addEntitiesToZep(client, userId, entities);
      await this.addFactsToZep(
        client,
        userId,
        relationships.map((r) => `${r.subject} ${r.predicate} ${r.object}`),
      );

      console.log(`✅ Created project entity: ${projectEntity.name}`);
      console.log(`📊 Technologies detected: ${techDetection?.technologies.length || 0}`);
      console.log(`🔗 Relationships created: ${relationships.length}`);

      return {
        success: true,
        projectEntity,
        relationships,
        technologiesDetected: techDetection?.technologies.length || 0,
        detectedTechnologies: techDetection?.technologies || [],
        message: `Project entity created successfully with ${relationships.length} relationships`,
      };
    } catch (error) {
      console.error('❌ Failed to create project entity:', error);
      return {
        success: false,
        error: `Failed to create project entity: ${(error as Error).message}`,
      };
    }
  }

  private async detectTechnologies(
    client: ZepClient,
    userId: string,
    projectContext: ProjectContext,
    options: EntityCreationOptions,
  ): Promise<TechnologyDetectionResult | null> {
    let techDetection: TechnologyDetectionResult | null = null;
    if (!options.skipTechDetection) {
      let shouldDetectTech = true;
      try {
        const existingResults = await client.graph.search({
          userId,
          query: `Project ${projectContext.projectName}`,
          scope: 'nodes',
          limit: 1,
        });

        if (existingResults?.nodes && existingResults.nodes.length > 0) {
          const existingNode = existingResults.nodes[0];
          if (existingNode) {
            const lastUpdated = existingNode.attributes?.lastUpdated;
            if (lastUpdated && typeof lastUpdated === 'string') {
              const lastUpdateTime = new Date(lastUpdated);
              const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
              shouldDetectTech = lastUpdateTime < oneDayAgo;
            }
          }
        }
      } catch {
        shouldDetectTech = true;
      }

      if (shouldDetectTech || options.forceUpdate) {
        techDetection = await detectProjectTechnologies(projectContext.projectPath, options.confidenceThreshold || 0.6);
      } else {
        console.log('⚡ Skipping technology detection - entity recently updated');
      }
    }
    return techDetection;
  }

  private createEntityProperties(
    projectContext: ProjectContext,
    techDetection: TechnologyDetectionResult | null,
  ): ProjectEntityProperties {
    return {
      displayName: projectContext.projectName,
      organization: projectContext.organization,
      repository: projectContext.gitRemote,
      projectType: projectContext.projectType,
      technologies: techDetection?.technologies.map((t) => t.name) || [],
      path: projectContext.projectPath,
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      confidence:
        techDetection?.technologies.reduce(
          (acc, tech) => {
            acc[tech.name] = tech.confidence;
            return acc;
          },
          {} as Record<string, number>,
        ) || {},
      metadata: {
        groupId: projectContext.groupId,
        detectionSources: techDetection?.technologies.map((t) => t.source) || [],
        overallConfidence: techDetection?.overallConfidence || 0,
        detectedAt: techDetection?.detectedAt,
      },
    };
  }

  private createProjectEntity(
    projectContext: ProjectContext,
    entityProperties: ProjectEntityProperties,
  ): ProjectEntity {
    return {
      type: 'Project',
      name: projectContext.projectId,
      properties: entityProperties,
    };
  }

  private prepareEntitiesForZep(
    projectEntity: ProjectEntity,
    techDetection: TechnologyDetectionResult | null,
    projectContext: ProjectContext,
  ): Array<{
    name: string;
    summary: string;
    labels: string[];
    attributes: Record<string, unknown>;
  }> {
    const entities: Array<{
      name: string;
      summary: string;
      labels: string[];
      attributes: Record<string, unknown>;
    }> = [
      {
        name: projectEntity.name,
        summary: `Project: ${projectEntity.properties?.displayName}`,
        labels: ['Location', projectContext.projectType],
        attributes: {
          ...projectEntity.properties,
          technologies: projectEntity.properties?.technologies?.join(', ') || '',
        },
      },
    ];

    if (techDetection) {
      for (const tech of techDetection.technologies) {
        entities.push({
          name: tech.name,
          summary: `Technology: ${tech.name}`,
          labels: ['Technology', tech.source],
          attributes: {
            name: tech.name,
            confidence: tech.confidence,
            source: tech.source,
            version: tech.version || 'unknown',
            context: tech.context || '',
          },
        });
      }
    }

    if (projectContext.organization) {
      entities.push({
        name: projectContext.organization,
        summary: `Organization: ${projectContext.organization}`,
        labels: ['Organization'],
        attributes: {
          name: projectContext.organization,
          type: 'organization',
        },
      });
    }
    return entities;
  }

  private prepareRelationshipsForZep(
    userId: string,
    projectContext: ProjectContext,
    techDetection: TechnologyDetectionResult | null,
  ): ProjectRelationship[] {
    const relationships: ProjectRelationship[] = [];

    relationships.push({
      subject: userId,
      predicate: 'WORKS_ON',
      object: projectContext.projectId,
      confidence: 1.0,
      context: 'Project developer relationship',
    });

    if (techDetection) {
      for (const tech of techDetection.technologies) {
        relationships.push({
          subject: projectContext.projectId,
          predicate: 'USES',
          object: tech.name,
          confidence: tech.confidence,
          context: tech.context || `Detected via ${tech.source}`,
        });
      }
    }

    if (projectContext.organization) {
      relationships.push({
        subject: projectContext.projectId,
        predicate: 'BELONGS_TO',
        object: projectContext.organization,
        confidence: 0.95,
        context: 'Organization ownership',
      });
    }
    return relationships;
  }

  private async addEntitiesToZep(
    client: ZepClient,
    userId: string,
    entities: Array<{
      name: string;
      summary: string;
      labels: string[];
      attributes: Record<string, unknown>;
    }>,
  ): Promise<void> {
    for (const entity of entities) {
      await client.graph.add({
        userId,
        type: 'json',
        data: JSON.stringify(entity),
      });
    }
  }

  private async addFactsToZep(client: ZepClient, userId: string, facts: string[]): Promise<void> {
    for (const fact of facts) {
      await client.graph.add({
        userId,
        type: 'text',
        data: fact,
      });
    }
  }

  /**
   * Update project entity with new technology detections
   */
  async updateProjectEntity(projectPath: string, forceUpdate = false): Promise<EntityCreationResult> {
    try {
      const projectContext = await detectProject(projectPath);
      const needsUpdate = forceUpdate || (await this.needsUpdate(projectContext));

      if (needsUpdate) {
        return this.ensureProjectEntity(projectPath, { forceUpdate: true });
      }

      return {
        success: true,
        message: 'No update needed',
      };
    } catch (error) {
      console.error('❌ Failed to update project entity:', error);
      return {
        success: false,
        error: `Failed to update project entity: ${(error as Error).message}`,
      };
    }
  }

  private async needsUpdate(projectContext: ProjectContext): Promise<boolean> {
    try {
      const client = createZepClient();
      const config = await getDefaultConfigAsync();
      const userId = config.userId || 'developer';

      const searchResults = await client.graph.search({
        userId,
        query: `Project ${projectContext.projectName}`,
        scope: 'nodes',
        limit: 1,
      });

      if (searchResults?.nodes && searchResults.nodes.length > 0) {
        const existingNode = searchResults.nodes[0];
        const existingTechs =
          existingNode && typeof existingNode.attributes?.technologies === 'string'
            ? existingNode.attributes.technologies.split(', ')
            : [];
        const techDetection = await detectProjectTechnologies(projectContext.projectPath);
        const newTechs = techDetection.technologies.map((t) => t.name);

        return newTechs.length !== existingTechs.length || !newTechs.every((tech) => existingTechs.includes(tech));
      }
      return true; // Entity doesn't exist, needs creation
    } catch (searchError) {
      console.warn('Could not check existing entity, proceeding with update:', searchError);
      return true;
    }
  }

  /**
   * Get project entity information
   */
  async getProjectEntity(projectId: string): Promise<{
    success: boolean;
    entity?: ZepNode;
    technologies?: string[];
    relationships?: unknown[];
    error?: string;
  }> {
    try {
      const client = createZepClient();
      const config = await getDefaultConfigAsync();
      const userId = config.userId || 'developer';

      const entityResults = await client.graph.search({
        userId,
        query: projectId,
        scope: 'nodes',
        searchFilters: {
          nodeLabels: ['Location'],
        },
        limit: 5,
      });

      const relationshipResults = await client.graph.search({
        userId,
        query: projectId,
        scope: 'edges',
        limit: 20,
      });

      const projectEntity = entityResults?.nodes?.find(
        (node) => node.name === projectId || node.attributes?.name === projectId,
      );

      if (!projectEntity) {
        return {
          success: false,
          error: `Project entity not found: ${projectId}`,
        };
      }

      const technologies =
        typeof projectEntity.attributes?.technologies === 'string'
          ? projectEntity.attributes.technologies.split(', ')
          : [];
      const relationships = relationshipResults?.edges || [];

      return {
        success: true,
        entity: projectEntity,
        technologies,
        relationships,
      };
    } catch (error) {
      console.error('❌ Failed to get project entity:', error);
      return {
        success: false,
        error: `Failed to get project entity: ${(error as Error).message}`,
      };
    }
  }

  /**
   * List all project entities for the current user
   */
  async listProjectEntities(): Promise<{
    success: boolean;
    projects?: unknown[];
    count?: number;
    error?: string;
  }> {
    try {
      const client = createZepClient();
      const config = await getDefaultConfigAsync();
      const userId = config.userId || 'developer';

      const searchResults = await client.graph.search({
        userId,
        query: '*', // Search for all nodes
        scope: 'nodes',
        searchFilters: {
          nodeLabels: ['Location'],
        },
        limit: 50,
      });

      const projects = searchResults?.nodes || [];

      return {
        success: true,
        projects,
        count: projects.length,
      };
    } catch (error) {
      console.error('❌ Failed to list project entities:', error);
      return {
        success: false,
        error: `Failed to list project entities: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Delete project entity and its relationships
   */
  deleteProjectEntity(projectId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      console.log(`⚠️  Project entity deletion not implemented yet. Would delete: ${projectId}`);
      console.log('Note: Zep handles entity deduplication automatically, so explicit deletion may not be needed.');

      return Promise.resolve({
        success: true,
        message: `Project entity deletion logged for: ${projectId}`,
      });
    } catch (error) {
      console.error('❌ Failed to delete project entity:', error);
      return Promise.resolve({
        success: false,
        error: `Failed to delete project entity: ${(error as Error).message}`,
      });
    }
  }

  /**
   * Create session relationship to project
   */
  async createSessionProjectRelationship(
    sessionId: string,
    projectId: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const client = createZepClient();
      const config = await getDefaultConfigAsync();
      const userId = config.userId || 'developer';

      const sessionFact = `session-${sessionId} OCCURS_IN ${projectId}`;

      await client.graph.add({
        userId,
        type: 'text',
        data: sessionFact,
      });

      return {
        success: true,
        message: `Session ${sessionId} linked to project ${projectId}`,
      };
    } catch (error) {
      console.error('❌ Failed to create session-project relationship:', error);
      return {
        success: false,
        error: `Failed to create session-project relationship: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get current project context from working directory
   */
  async getCurrentProjectContext(): Promise<{
    success: boolean;
    project?: {
      projectId: string;
      projectName: string;
      organization?: string;
      projectPath: string;
      technologies: string[];
      lastActivity?: string;
      sessionCount: number;
    };
    error?: string;
  }> {
    try {
      const projectContext = await detectProject();

      const entityResult = await this.getProjectEntity(projectContext.projectId);

      if (entityResult.success && entityResult.entity) {
        const client = createZepClient();
        const config = await getDefaultConfigAsync();
        const userId = config.userId || 'developer';

        const sessionResults = await client.graph.search({
          userId,
          query: `session OCCURS_IN ${projectContext.projectId}`,
          scope: 'edges',
          limit: 50,
        });

        const sessionEdges =
          sessionResults?.edges?.filter(
            (edge) => (edge.name === 'OCCURS_IN' || edge.name === 'OCCURRED_IN') && edge.fact?.includes('session-'),
          ) || [];

        return {
          success: true,
          project: {
            projectId: projectContext.projectId,
            projectName: projectContext.projectName,
            organization: projectContext.organization,
            projectPath: projectContext.projectPath,
            technologies: entityResult.technologies || [],
            lastActivity: entityResult.entity.attributes?.lastUpdated as string,
            sessionCount: sessionEdges.length,
          },
        };
      }
      return {
        success: true,
        project: {
          projectId: projectContext.projectId,
          projectName: projectContext.projectName,
          organization: projectContext.organization,
          projectPath: projectContext.projectPath,
          technologies: [],
          sessionCount: 0,
        },
      };
    } catch (error) {
      console.error('❌ Failed to get current project context:', error);
      return {
        success: false,
        error: `Failed to get current project context: ${(error as Error).message}`,
      };
    }
  }
}

// Export standalone functions for backward compatibility
const projectEntitiesServiceInstance = new ProjectEntitiesService();

export async function listProjectEntities(): Promise<{
  success: boolean;
  projects?: unknown[];
  entities?: ProjectEntity[];
  count?: number;
  error?: string;
}> {
  const result = await projectEntitiesServiceInstance.listProjectEntities();
  return {
    ...result,
    entities: result.projects as ProjectEntity[],
  };
}

export function ensureProjectEntity(
  projectPath: string,
  options: EntityCreationOptions = {},
): Promise<EntityCreationResult> {
  return projectEntitiesServiceInstance.ensureProjectEntity(projectPath, options);
}
