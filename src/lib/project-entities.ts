/**
 * Project Entity Management for TemporalBridge
 * Manages Project entities and relationships in Zep's knowledge graph
 */

import { createZepClient, getDefaultConfigAsync } from "./zep-client.ts";
import { detectProject, detectProjectTechnologies } from "./project-detector.ts";
import type { 
  ProjectEntity, 
  ProjectEntityProperties, 
  ProjectRelationship,
  ProjectRelationshipType,
  TechnologyDetectionResult,
  EntityCreationOptions 
} from "./types.ts";

export interface EntityCreationResult {
  success: boolean;
  projectEntity?: ProjectEntity;
  relationships?: ProjectRelationship[];
  technologiesDetected?: number;
  message?: string;
  error?: string;
}

/**
 * Create or update a Project entity in Zep's knowledge graph
 */
export async function ensureProjectEntity(
  projectPath: string,
  options: EntityCreationOptions = {}
): Promise<EntityCreationResult> {
  try {
    const client = createZepClient();
    const config = await getDefaultConfigAsync();
    const userId = config.userId || "developer";

    // Detect project context
    const projectContext = await detectProject(projectPath);
    
    // Detect technologies if not skipped (with basic caching)
    let techDetection: TechnologyDetectionResult | null = null;
    if (!options.skipTechDetection) {
      // Check if entity already exists before expensive technology detection
      let shouldDetectTech = true;
      try {
        const existingResults = await client.graph.search({
          userId,
          query: `Project ${projectContext.projectName}`,
          scope: 'nodes',
          limit: 1
        });
        
        if (existingResults?.nodes && existingResults.nodes.length > 0) {
          const existingNode = existingResults.nodes[0];
          if (existingNode) {
            // If entity exists and was updated recently (within 24 hours), skip tech detection
            const lastUpdated = existingNode.attributes?.lastUpdated;
            if (lastUpdated && typeof lastUpdated === 'string') {
              const lastUpdateTime = new Date(lastUpdated);
              const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
              shouldDetectTech = lastUpdateTime < oneDayAgo;
            }
          }
        }
      } catch {
        // If search fails, proceed with detection
        shouldDetectTech = true;
      }
      
      if (shouldDetectTech || options.forceUpdate) {
        techDetection = await detectProjectTechnologies(
          projectPath, 
          options.confidenceThreshold || 0.6
        );
      } else {
        console.log(`⚡ Skipping technology detection - entity recently updated`);
      }
    }

    // Create project entity properties
    const entityProperties: ProjectEntityProperties = {
      displayName: projectContext.projectName,
      organization: projectContext.organization,
      repository: projectContext.gitRemote,
      projectType: projectContext.projectType,
      technologies: techDetection?.technologies.map(t => t.name) || [],
      path: projectContext.projectPath,
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      confidence: techDetection?.technologies.reduce((acc, tech) => {
        acc[tech.name] = tech.confidence;
        return acc;
      }, {} as Record<string, number>) || {},
      metadata: {
        groupId: projectContext.groupId,
        detectionSources: techDetection?.technologies.map(t => t.source) || [],
        overallConfidence: techDetection?.overallConfidence || 0,
        detectedAt: techDetection?.detectedAt
      }
    };

    // Create project entity
    const projectEntity: ProjectEntity = {
      type: "Project",
      name: projectContext.projectId,
      properties: entityProperties
    };

    // Prepare entities array for Zep
    const entities: any[] = [
      {
        name: projectEntity.name,
        summary: `Project: ${entityProperties.displayName}`,
        labels: ["project", projectContext.projectType],
        attributes: {
          ...entityProperties,
          technologies: entityProperties.technologies.join(", ")
        }
      }
    ];

    // Add technology entities
    if (techDetection) {
      for (const tech of techDetection.technologies) {
        entities.push({
          name: tech.name,
          summary: `Technology: ${tech.name}`,
          labels: ["technology", tech.source],
          attributes: {
            name: tech.name,
            confidence: tech.confidence,
            source: tech.source,
            version: tech.version || "unknown",
            context: tech.context || ""
          }
        });
      }
    }

    // Add organization entity if present
    if (projectContext.organization) {
      entities.push({
        name: projectContext.organization,
        summary: `Organization: ${projectContext.organization}`,
        labels: ["organization"],
        attributes: {
          name: projectContext.organization,
          type: "organization"
        }
      });
    }

    // Prepare relationships (facts)
    const facts: string[] = [];
    const relationships: ProjectRelationship[] = [];

    // Developer works on project
    const developerWorksOnFact = `${userId} WORKS_ON ${projectContext.projectId}`;
    facts.push(developerWorksOnFact);
    relationships.push({
      subject: userId,
      predicate: "WORKS_ON",
      object: projectContext.projectId,
      confidence: 1.0,
      context: "Project developer relationship"
    });

    // Project uses technologies
    if (techDetection) {
      for (const tech of techDetection.technologies) {
        const techUsesFact = `${projectContext.projectId} USES ${tech.name}`;
        facts.push(techUsesFact);
        relationships.push({
          subject: projectContext.projectId,
          predicate: "USES",
          object: tech.name,
          confidence: tech.confidence,
          context: tech.context || `Detected via ${tech.source}`
        });
      }
    }

    // Project belongs to organization
    if (projectContext.organization) {
      const belongsToFact = `${projectContext.projectId} BELONGS_TO ${projectContext.organization}`;
      facts.push(belongsToFact);
      relationships.push({
        subject: projectContext.projectId,
        predicate: "BELONGS_TO",
        object: projectContext.organization,
        confidence: 0.95,
        context: "Organization ownership"
      });
    }

    // Create entities and relationships in Zep
    // Add entities first
    for (const entity of entities) {
      await client.graph.add({
        userId,
        type: "json",
        data: JSON.stringify(entity)
      });
    }
    
    // Add facts
    for (const fact of facts) {
      await client.graph.add({
        userId,
        type: "text", 
        data: fact
      });
    }

    console.log(`✅ Created project entity: ${projectEntity.name}`);
    console.log(`📊 Technologies detected: ${techDetection?.technologies.length || 0}`);
    console.log(`🔗 Relationships created: ${relationships.length}`);

    return {
      success: true,
      projectEntity,
      relationships,
      technologiesDetected: techDetection?.technologies.length || 0,
      message: `Project entity created successfully with ${relationships.length} relationships`
    };

  } catch (error) {
    console.error(`❌ Failed to create project entity:`, error);
    return {
      success: false,
      error: `Failed to create project entity: ${(error as Error).message}`
    };
  }
}

/**
 * Update project entity with new technology detections
 */
export async function updateProjectEntity(
  projectPath: string,
  forceUpdate = false
): Promise<EntityCreationResult> {
  try {
    const client = createZepClient();
    const config = await getDefaultConfigAsync();
    const userId = config.userId || "developer";

    // Detect current project state
    const projectContext = await detectProject(projectPath);
    const techDetection = await detectProjectTechnologies(projectPath);

    // Get existing project entity to check if update needed
    let needsUpdate = forceUpdate;
    
    if (!needsUpdate) {
      try {
        // Search for existing project entity
        const searchResults = await client.graph.search({
          userId,
          query: `Project ${projectContext.projectName}`,
          scope: 'nodes',
          limit: 1
        });

        if (searchResults?.nodes && searchResults.nodes.length > 0) {
          const existingNode = searchResults.nodes[0];
          const existingTechs = existingNode && typeof existingNode.attributes?.technologies === 'string' 
            ? existingNode.attributes.technologies.split(", ") 
            : [];
          const newTechs = techDetection.technologies.map(t => t.name);
          
          // Check if technologies have changed
          const techsChanged = newTechs.length !== existingTechs.length ||
            !newTechs.every(tech => existingTechs.includes(tech));
          
          needsUpdate = techsChanged;
          
          if (!needsUpdate) {
            return {
              success: true,
              message: "Project entity is already up to date"
            };
          }
        } else {
          needsUpdate = true; // Entity doesn't exist, needs creation
        }
      } catch (searchError) {
        console.warn("Could not check existing entity, proceeding with update:", searchError);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      // Use ensureProjectEntity to create/update
      return await ensureProjectEntity(projectPath, { forceUpdate: true });
    }

    return {
      success: true,
      message: "No update needed"
    };

  } catch (error) {
    console.error(`❌ Failed to update project entity:`, error);
    return {
      success: false,
      error: `Failed to update project entity: ${(error as Error).message}`
    };
  }
}

/**
 * Get project entity information
 */
export async function getProjectEntity(projectId: string): Promise<{
  success: boolean;
  entity?: any;
  technologies?: string[];
  relationships?: any[];
  error?: string;
}> {
  try {
    const client = createZepClient();
    const config = await getDefaultConfigAsync();
    const userId = config.userId || "developer";

    // Search for project entity
    const entityResults = await client.graph.search({
      userId,
      query: projectId,
      scope: 'nodes',
      limit: 5
    });

    // Search for project relationships
    const relationshipResults = await client.graph.search({
      userId,
      query: projectId,
      scope: 'edges',
      limit: 20
    });

    const projectEntity = entityResults?.nodes?.find(node => 
      node.name === projectId || node.attributes?.name === projectId
    );

    if (!projectEntity) {
      return {
        success: false,
        error: `Project entity not found: ${projectId}`
      };
    }

    const technologies = typeof projectEntity.attributes?.technologies === 'string' 
      ? projectEntity.attributes.technologies.split(", ") 
      : [];
    const relationships = relationshipResults?.edges || [];

    return {
      success: true,
      entity: projectEntity,
      technologies,
      relationships
    };

  } catch (error) {
    console.error(`❌ Failed to get project entity:`, error);
    return {
      success: false,
      error: `Failed to get project entity: ${(error as Error).message}`
    };
  }
}

/**
 * List all project entities for the current user
 */
export async function listProjectEntities(): Promise<{
  success: boolean;
  projects?: any[];
  count?: number;
  error?: string;
}> {
  try {
    const client = createZepClient();
    const config = await getDefaultConfigAsync();
    const userId = config.userId || "developer";

    const searchResults = await client.graph.search({
      userId,
      query: "Project",
      scope: 'nodes',
      limit: 50
    });

    const projects = searchResults?.nodes?.filter(node => 
      node.labels?.includes("project") || node.labels?.includes("Project")
    ) || [];

    return {
      success: true,
      projects,
      count: projects.length
    };

  } catch (error) {
    console.error(`❌ Failed to list project entities:`, error);
    return {
      success: false,
      error: `Failed to list project entities: ${(error as Error).message}`
    };
  }
}

/**
 * Delete project entity and its relationships
 */
export async function deleteProjectEntity(projectId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    console.log(`⚠️  Project entity deletion not implemented yet. Would delete: ${projectId}`);
    console.log("Note: Zep handles entity deduplication automatically, so explicit deletion may not be needed.");
    
    return {
      success: true,
      message: `Project entity deletion logged for: ${projectId}`
    };

  } catch (error) {
    console.error(`❌ Failed to delete project entity:`, error);
    return {
      success: false,
      error: `Failed to delete project entity: ${(error as Error).message}`
    };
  }
}

/**
 * Create session relationship to project
 */
export async function createSessionProjectRelationship(
  sessionId: string,
  projectId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const client = createZepClient();
    const config = await getDefaultConfigAsync();
    const userId = config.userId || "developer";

    const sessionFact = `session-${sessionId} OCCURS_IN ${projectId}`;
    
    await client.graph.add({
      userId,
      type: "text",
      data: sessionFact
    });

    return {
      success: true,
      message: `Session ${sessionId} linked to project ${projectId}`
    };

  } catch (error) {
    console.error(`❌ Failed to create session-project relationship:`, error);
    return {
      success: false,
      error: `Failed to create session-project relationship: ${(error as Error).message}`
    };
  }
}

/**
 * Additional Project Management Functions
 */

/**
 * Get project technologies with detailed information
 */
export async function getProjectTechnologies(projectId: string): Promise<{
  success: boolean;
  projectId: string;
  technologies?: Array<{
    name: string;
    confidence: number;
    usageContext: string;
    detectedVia: string[];
  }>;
  totalTechnologies?: number;
  error?: string;
}> {
  try {
    const client = createZepClient();
    const config = await getDefaultConfigAsync();
    const userId = config.userId || "developer";

    // Search for technology usage relationships for this project
    const techResults = await client.graph.search({
      userId,
      query: `${projectId} USES`,
      scope: 'edges',
      limit: 100
    });

    const technologies = [];

    if (techResults?.edges) {
      for (const edge of techResults.edges) {
        const match = edge.fact?.match(new RegExp(`${projectId}\\s+USES\\s+(.+)`));
        if (match && match[1]) {
          const techName = match[1];
          technologies.push({
            name: techName,
            confidence: edge.score || 0,
            usageContext: edge.episodes?.length ? `${edge.episodes.length} conversations` : "Direct usage",
            detectedVia: edge.episodes || []
          });
        }
      }
    }

    return {
      success: true,
      projectId,
      technologies,
      totalTechnologies: technologies.length
    };

  } catch (error) {
    console.error(`❌ Failed to get project technologies:`, error);
    return {
      success: false,
      projectId,
      error: `Failed to get project technologies: ${(error as Error).message}`
    };
  }
}

/**
 * Get current project context from working directory
 */
export async function getCurrentProjectContext(): Promise<{
  success: boolean;
  project?: {
    projectId: string;
    projectName: string;
    organization?: string;
    projectPath: string;
    technologies: string[];
    lastActivity?: string;
    conversationCount: number;
  };
  error?: string;
}> {
  try {
    const { detectProject } = await import("./project-detector.ts");
    const projectContext = await detectProject();
    
    // Get project entity details
    const entityResult = await getProjectEntity(projectContext.projectId);
    
    if (entityResult.success && entityResult.entity) {
      // Get conversation count for this project
      const client = createZepClient();
      const config = await getDefaultConfigAsync();
      const userId = config.userId || "developer";
      
      const conversationResults = await client.graph.search({
        userId,
        query: `OCCURS_IN ${projectContext.projectId}`,
        scope: 'edges',
        limit: 100
      });
      
      return {
        success: true,
        project: {
          projectId: projectContext.projectId,
          projectName: projectContext.projectName,
          organization: projectContext.organization,
          projectPath: projectContext.projectPath,
          technologies: entityResult.technologies || [],
          lastActivity: entityResult.entity.attributes?.lastUpdated,
          conversationCount: conversationResults?.edges?.length || 0
        }
      };
    } else {
      return {
        success: true,
        project: {
          projectId: projectContext.projectId,
          projectName: projectContext.projectName,
          organization: projectContext.organization,
          projectPath: projectContext.projectPath,
          technologies: [],
          conversationCount: 0
        }
      };
    }

  } catch (error) {
    console.error(`❌ Failed to get current project context:`, error);
    return {
      success: false,
      error: `Failed to get current project context: ${(error as Error).message}`
    };
  }
}

/**
 * Get project relationships and connections
 */
export async function getProjectRelationships(projectId: string): Promise<{
  success: boolean;
  projectId: string;
  relationships?: {
    developers: string[];
    technologies: string[];
    organization?: string;
    sessions: string[];
    relatedProjects: string[];
  };
  error?: string;
}> {
  try {
    const client = createZepClient();
    const config = await getDefaultConfigAsync();
    const userId = config.userId || "developer";

    // Search for all relationships involving this project
    const relationshipResults = await client.graph.search({
      userId,
      query: projectId,
      scope: 'edges',
      limit: 100
    });

    const relationships = {
      developers: [] as string[],
      technologies: [] as string[],
      organization: undefined as string | undefined,
      sessions: [] as string[],
      relatedProjects: [] as string[]
    };

    if (relationshipResults?.edges) {
      for (const edge of relationshipResults.edges) {
        const fact = edge.fact || "";
        
        // Parse different relationship types
        if (fact.includes(" WORKS_ON ")) {
          const developerMatch = fact.match(/(.+)\s+WORKS_ON\s+/);
          if (developerMatch && developerMatch[1]) {
            relationships.developers.push(developerMatch[1]);
          }
        } else if (fact.includes(" USES ")) {
          const techMatch = fact.match(/\s+USES\s+(.+)/);
          if (techMatch && techMatch[1]) {
            relationships.technologies.push(techMatch[1]);
          }
        } else if (fact.includes(" BELONGS_TO ")) {
          const orgMatch = fact.match(/\s+BELONGS_TO\s+(.+)/);
          if (orgMatch && orgMatch[1]) {
            relationships.organization = orgMatch[1];
          }
        } else if (fact.includes(" OCCURS_IN ")) {
          const sessionMatch = fact.match(/session-([^\s]+)/);
          if (sessionMatch && sessionMatch[1]) {
            relationships.sessions.push(sessionMatch[1]);
          }
        }
      }
    }

    // Remove duplicates
    relationships.developers = [...new Set(relationships.developers)];
    relationships.technologies = [...new Set(relationships.technologies)];
    relationships.sessions = [...new Set(relationships.sessions)];

    return {
      success: true,
      projectId,
      relationships
    };

  } catch (error) {
    console.error(`❌ Failed to get project relationships:`, error);
    return {
      success: false,
      projectId,
      error: `Failed to get project relationships: ${(error as Error).message}`
    };
  }
}

/**
 * Get project statistics and analytics
 */
export async function getProjectStatistics(projectId?: string): Promise<{
  success: boolean;
  statistics?: {
    totalProjects: number;
    totalTechnologies: number;
    totalConversations: number;
    mostUsedTechnologies: Array<{ name: string; count: number; confidence: number }>;
    projectActivity: Array<{ projectId: string; conversationCount: number; lastActivity: string }>;
    organizationBreakdown: Record<string, number>;
  };
  projectSpecific?: {
    projectId: string;
    technologies: number;
    conversations: number;
    relationships: number;
    expertiseScore: number;
  };
  error?: string;
}> {
  try {
    const client = createZepClient();
    const config = await getDefaultConfigAsync();
    const userId = config.userId || "developer";

    // If specific project requested, get project-specific stats
    if (projectId) {
      const [entityResult, relationshipResult] = await Promise.all([
        getProjectEntity(projectId),
        getProjectRelationships(projectId)
      ]);

      if (!entityResult.success) {
        return {
          success: false,
          error: `Project not found: ${projectId}`
        };
      }

      const technologies = entityResult.technologies?.length || 0;
      const conversations = relationshipResult.relationships?.sessions.length || 0;
      const totalRelationships = (relationshipResult.relationships?.developers.length || 0) +
                               (relationshipResult.relationships?.technologies.length || 0) +
                               (relationshipResult.relationships?.sessions.length || 0) +
                               (relationshipResult.relationships?.organization ? 1 : 0);

      const expertiseScore = technologies * 2 + conversations * 0.5 + totalRelationships * 0.1;

      return {
        success: true,
        projectSpecific: {
          projectId,
          technologies,
          conversations,
          relationships: totalRelationships,
          expertiseScore: Math.round(expertiseScore * 100) / 100
        }
      };
    }

    // Get overall statistics
    const [projectResults, techResults, conversationResults] = await Promise.all([
      client.graph.search({ userId, query: "Project", scope: 'nodes', limit: 100 }),
      client.graph.search({ userId, query: "USES", scope: 'edges', limit: 200 }),
      client.graph.search({ userId, query: "OCCURS_IN", scope: 'edges', limit: 200 })
    ]);

    const statistics = {
      totalProjects: 0,
      totalTechnologies: 0,
      totalConversations: 0,
      mostUsedTechnologies: [] as Array<{ name: string; count: number; confidence: number }>,
      projectActivity: [] as Array<{ projectId: string; conversationCount: number; lastActivity: string }>,
      organizationBreakdown: {} as Record<string, number>
    };

    // Count projects and organizations
    if (projectResults?.nodes) {
      const projects = projectResults.nodes.filter(node => 
        node.labels?.includes("project") || node.labels?.includes("Project")
      );
      statistics.totalProjects = projects.length;

      for (const project of projects) {
        const org = typeof project.attributes?.organization === 'string' ? project.attributes.organization : "Unknown";
        statistics.organizationBreakdown[org] = (statistics.organizationBreakdown[org] || 0) + 1;
      }
    }

    // Analyze technology usage
    const techUsage = new Map<string, { count: number; totalConfidence: number }>();
    if (techResults?.edges) {
      for (const edge of techResults.edges) {
        const match = edge.fact?.match(/\s+USES\s+(.+)/);
        if (match && match[1]) {
          const techName = match[1];
          const existing = techUsage.get(techName) || { count: 0, totalConfidence: 0 };
          existing.count++;
          existing.totalConfidence += edge.score || 0;
          techUsage.set(techName, existing);
        }
      }
    }

    statistics.mostUsedTechnologies = Array.from(techUsage.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        confidence: Math.round((data.totalConfidence / data.count) * 100) / 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    statistics.totalTechnologies = techUsage.size;
    statistics.totalConversations = conversationResults?.edges?.length || 0;

    return {
      success: true,
      statistics
    };

  } catch (error) {
    console.error(`❌ Failed to get project statistics:`, error);
    return {
      success: false,
      error: `Failed to get project statistics: ${(error as Error).message}`
    };
  }
}