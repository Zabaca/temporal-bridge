/**
 * Project Entity Management for TemporalBridge
 * Manages Project entities and relationships in Zep's knowledge graph
 */

import { createZepClient, getDefaultConfigAsync } from "./zep-client";
import { detectProject, detectProjectTechnologies } from "./project-detector";
import type { 
  ProjectEntity, 
  ProjectEntityProperties, 
  ProjectRelationship,
  TechnologyDetectionResult,
  EntityCreationOptions 
} from "./types";

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
    const entities: Array<{
      name: string;
      summary: string;
      labels: string[];
      attributes: Record<string, unknown>;
    }> = [
      {
        name: projectEntity.name,
        summary: `Project: ${entityProperties.displayName}`,
        labels: ["Location", projectContext.projectType],
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
          labels: ["Technology", tech.source],
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
        labels: ["Organization"],
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
      detectedTechnologies: techDetection?.technologies || [],
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
  entity?: unknown;
  technologies?: string[];
  relationships?: unknown[];
  error?: string;
}> {
  try {
    const client = createZepClient();
    const config = await getDefaultConfigAsync();
    const userId = config.userId || "developer";

    // Search for project entity using Location labels
    const entityResults = await client.graph.search({
      userId,
      query: projectId,
      scope: 'nodes',
      searchFilters: {
        nodeLabels: ["Location"]
      },
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
  projects?: unknown[];
  count?: number;
  error?: string;
}> {
  try {
    const client = createZepClient();
    const config = await getDefaultConfigAsync();
    const userId = config.userId || "developer";

    const searchResults = await client.graph.search({
      userId,
      query: "*", // Search for all nodes
      scope: 'nodes',
      searchFilters: {
        nodeLabels: ["Location"]
      },
      limit: 50
    });

    const projects = searchResults?.nodes || [];

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
    sessionCount: number;
  };
  error?: string;
}> {
  try {
    const { detectProject } = await import("./project-detector.js");
    const projectContext = await detectProject();
    
    // Get project entity details
    const entityResult = await getProjectEntity(projectContext.projectId);
    
    if (entityResult.success && entityResult.entity) {
      // Get session count for this project
      const client = createZepClient();
      const config = await getDefaultConfigAsync();
      const userId = config.userId || "developer";
      
      const sessionResults = await client.graph.search({
        userId,
        query: `session OCCURS_IN ${projectContext.projectId}`,
        scope: 'edges',
        limit: 50
      });
      
      // Filter for session relationships only
      const sessionEdges = sessionResults?.edges?.filter(edge => 
        (edge.name === 'OCCURS_IN' || edge.name === 'OCCURRED_IN') && 
        edge.fact?.includes('session-')
      ) || [];
      
      return {
        success: true,
        project: {
          projectId: projectContext.projectId,
          projectName: projectContext.projectName,
          organization: projectContext.organization,
          projectPath: projectContext.projectPath,
          technologies: entityResult.technologies || [],
          lastActivity: (entityResult.entity as any).attributes?.lastUpdated,
          sessionCount: sessionEdges.length
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
          sessionCount: 0
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