/**
 * TemporalBridge Memory Tools
 * Structured functions for memory search and retrieval via MCP
 */

import { createZepClient, getDefaultConfig, getDefaultConfigAsync } from "./zep-client.ts";
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
  const config = await getDefaultConfigAsync();
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
 * Search memory across different scopes (edges, nodes, episodes) with optional project filtering
 */
export async function searchMemory(
  query: string, 
  scope: "edges" | "nodes" | "episodes" = "episodes", 
  limit = 5,
  reranker: 'cross_encoder' | 'none' = 'cross_encoder',
  projectFilter?: string
): Promise<MemorySearchResult[]> {
  const config = await getDefaultConfigAsync();
  const client = createZepClient();
  
  try {
    // Enhance query with project filter if provided
    const enhancedQuery = projectFilter ? `${query} ${projectFilter}` : query;
    
    const searchResults = await client.graph.search({
      userId: config.userId || "developer",
      query: enhancedQuery,
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
            project_filtered: !!projectFilter,
            project_filter: projectFilter,
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
            project_filtered: !!projectFilter,
            project_filter: projectFilter,
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
            project_filtered: !!projectFilter,
            project_filter: projectFilter,
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
  const config = await getDefaultConfigAsync();
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
    const errorMsg = (error as any).message || String(error);
    console.error("[DEBUG] getThreadContext error:", {
      error: errorMsg,
      threadId,
      userId: config.userId,
      statusCode: (error as any).status || (error as any).statusCode
    });
    
    // Handle 404 - thread doesn't exist yet
    if (errorMsg.includes("404") || errorMsg.includes("NotFoundError") || errorMsg.includes("not found")) {
      return {
        context_summary: `Thread ${threadId} not found - likely a new conversation that hasn't been stored yet.`,
        facts: [],
        thread_id: threadId,
        user_id: config.userId || "developer"
      };
    }
    
    return {
      context_summary: `Error retrieving context: ${errorMsg}`,
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
  const config = await getDefaultConfigAsync();
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
  debugListProjects?: boolean;
  debugPortfolio?: boolean;
  debugCreateEntity?: boolean;
}

export interface UnifiedMemoryResult {
  content: string;
  score?: number;
  timestamp?: string;
  type: 'graph_search' | 'user_context' | 'recent_episodes' | 'current_context';
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
 * Get current thread ID from project session file
 */
export async function getCurrentThreadId(): Promise<string> {
  const config = getDefaultConfig();
  const projectPath = Deno.env.get("PROJECT_DIR") || Deno.cwd();
  
  try {
    // Read session info from project directory
    const { getCurrentSessionId } = await import("./session-manager.ts");
    const sessionId = await getCurrentSessionId(projectPath);
    
    if (!sessionId) {
      throw new Error("No session ID found in .claude-session-id file");
    }
    
    // Detect project context  
    const { detectProject } = await import("./project-detector.ts");
    const projectContext = await detectProject(projectPath);
    
    return `claude-code-${projectContext.projectId}-${sessionId}`;
  } catch (error) {
    throw new Error(`Cannot get current thread ID: ${(error as any).message}. Make sure conversation hook is active.`);
  }
}

/**
 * Get memory context for current Claude Code session
 */
export async function getCurrentContext(): Promise<ThreadContextResult> {
  try {
    const config = await getDefaultConfigAsync();
    const projectPath = Deno.env.get("PROJECT_DIR") || Deno.cwd();
    
    // Debug logging
    console.error("[DEBUG] getCurrentContext:", {
      userId: config.userId,
      projectPath,
      cwd: Deno.cwd(),
      env_PROJECT_DIR: Deno.env.get("PROJECT_DIR")
    });
    
    const threadId = await getCurrentThreadId();
    console.error("[DEBUG] Thread ID:", threadId);
    
    return await getThreadContext(threadId);
  } catch (error) {
    const errorMsg = (error as any).message || String(error);
    console.error("[DEBUG] getCurrentContext error:", errorMsg);
    
    // Return graceful error for new threads or missing sessions
    if (errorMsg.includes("Cannot get current thread ID") || errorMsg.includes("No such file")) {
      return {
        context_summary: "No conversation context yet - this appears to be a new session.",
        facts: [],
        thread_id: "new-session",
        user_id: (await getDefaultConfigAsync()).userId || "developer"
      };
    }
    
    throw error;
  }
}

/**
 * Unified memory retrieval function that handles all search patterns
 */
export async function retrieveMemory(options: UnifiedMemoryQuery = {}): Promise<UnifiedMemoryResult[]> {
  const config = getDefaultConfig();
  const userId = options.userId || config.userId || "developer";
  const results: UnifiedMemoryResult[] = [];
  
  try {
    // Handle debug commands
    if (options.debugListProjects) {
      console.log("🔍 DEBUG: Testing listProjectEntities() API call\n");
      const { listProjectEntities } = await import("./project-entities.ts");
      const result = await listProjectEntities();
      console.log("Raw API Response:", JSON.stringify(result, null, 2));
      return [];
    }
    
    if (options.debugPortfolio) {
      console.log("🔍 DEBUG: Testing getProjectPortfolio() API call\n");
      const result = await getProjectPortfolio();
      console.log("Raw API Response:", JSON.stringify(result, null, 2));
      return [];
    }
    
    if (options.debugCreateEntity) {
      console.log("🔍 DEBUG: Creating test project entity with corrected PascalCase labels\n");
      const { ensureProjectEntity } = await import("./project-entities.ts");
      
      const projectPath = Deno.cwd();
      console.log(`Creating entity for project path: ${projectPath}`);
      
      const result = await ensureProjectEntity(projectPath, { 
        forceUpdate: true, // Force recreation to get new labels
        skipTechDetection: false 
      });
      
      console.log("Entity Creation Result:", JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log(`\n✅ SUCCESS: Created entity '${result.projectEntity?.name}' with ${result.technologiesDetected} technologies`);
        console.log(`🔗 Created ${result.relationships?.length || 0} relationships`);
        
        // Also test with a generic search to see if entity exists at all
        console.log("\n🔍 Testing with generic search to see if entity exists...");
        const searchResults = await searchMemory("zabaca-temporal-bridge", "nodes", 5);
        console.log(`Found ${searchResults.length} results in generic search:`);
        searchResults.forEach((result, i) => {
          console.log(`${i+1}. ${result.content.substring(0, 100)}...`);
        });
        
        // Now test if it shows up in list_projects  
        console.log("\n🔍 Testing if new entity appears in list_projects...");
        const { listProjectEntities } = await import("./project-entities.ts");
        const listResult = await listProjectEntities();
        console.log("List Projects Result:", JSON.stringify(listResult, null, 2));
        
        if (listResult.success && listResult.count && listResult.count > 0) {
          console.log(`\n✅ VERIFICATION SUCCESS: Found ${listResult.count} project(s) in list_projects!`);
        } else {
          console.log(`\n❌ VERIFICATION FAILED: Still no projects found in list_projects`);
        }
      } else {
        console.log(`\n❌ FAILED: ${result.error}`);
      }
      
      return [];
    }
    
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

/**
 * Search project group graph for shared knowledge
 */
export async function searchProjectMemory(
  query: string,
  graphId: string,
  scope: "edges" | "nodes" | "episodes" = "edges",
  limit = 10,
  reranker: 'cross_encoder' | 'none' = 'cross_encoder'
): Promise<MemorySearchResult[]> {
  const client = createZepClient();
  
  try {
    const searchResults = await client.graph.search({
      graphId,
      query,
      scope,
      reranker: reranker === 'none' ? undefined : reranker,
      limit
    });

    if (!searchResults) {
      return [];
    }

    const results: MemorySearchResult[] = [];

    // Process edges (facts/relationships)
    if (searchResults.edges) {
      for (const edge of searchResults.edges) {
        results.push({
          content: edge.fact || edge.name || "Unknown fact",
          score: edge.score || 0,
          type: "edge",
          created_at: edge.createdAt,
          metadata: {
            scope: "group_edges",
            uuid: edge.uuid,
            source: "project_knowledge",
            graphId,
            fact: edge.fact,
            sourceNode: (edge as any).sourceNodeName,
            targetNode: (edge as any).targetNodeName
          }
        });
      }
    }

    // Process nodes (entities)
    if (searchResults.nodes) {
      for (const node of searchResults.nodes) {
        results.push({
          content: node.summary || node.name || "Unknown entity",
          score: node.score || 0,
          type: "node",
          created_at: node.createdAt,
          metadata: {
            scope: "group_nodes",
            uuid: node.uuid,
            source: "project_entities",
            graphId,
            name: node.name,
            summary: node.summary
          }
        });
      }
    }

    // Process episodes (conversations)
    if (searchResults.episodes) {
      for (const episode of searchResults.episodes) {
        results.push({
          content: episode.content || "Episode content",
          score: episode.score || 0,
          type: "episode",
          created_at: episode.createdAt,
          metadata: {
            scope: "group_episodes",
            uuid: episode.uuid,
            source: "project_conversations",
            graphId,
            processed: episode.processed,
            role_type: episode.roleType
          }
        });
      }
    }

    return results;
  } catch (error) {
    console.error("❌ Error searching project memory:", error);
    return [];
  }
}

/**
 * Add content to project group graph
 */
export async function addToProjectGroup(
  graphId: string,
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const client = createZepClient();
  
  try {
    await client.graph.add({
      graphId,
      type: "text",
      data: content,
      sourceDescription: metadata ? JSON.stringify(metadata) : undefined
    });
  } catch (error) {
    console.error("❌ Error adding to project group:", error);
    throw error;
  }
}

/**
 * Ensure project group exists, create if needed
 */
export async function ensureProjectGroup(graphId: string, projectName: string): Promise<void> {
  const client = createZepClient();
  
  try {
    // Try to check if group exists by searching it
    await client.graph.search({
      graphId,
      query: "test",
      limit: 1
    });
    // If no error, group exists
  } catch (error) {
    // If 404 or similar, group doesn't exist, create it
    if ((error as any).status === 404 || (error as any).statusCode === 404) {
      try {
        await client.graph.create({
          graphId,
          name: projectName,
          description: `Project knowledge graph for ${projectName} created by temporal-bridge`
        });
        console.log(`✅ Created project group: ${graphId}`);
      } catch (createError) {
        // Group might have been created between check and create
        if (!(createError as any).message?.includes("already exists")) {
          throw createError;
        }
      }
    } else {
      // Some other error, re-throw
      throw error;
    }
  }
}

/**
 * Share knowledge to project group graph
 */
export async function shareToProjectGroup(
  message: string,
  projectName?: string
): Promise<{ success: boolean; message: string; graphId?: string }> {
  try {
    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new Error("Message is required and cannot be empty");
    }
    
    if (message.trim().length > 10000) {
      throw new Error("Message is too long (max 10,000 characters)");
    }
    
    // Get project context
    const config = await getDefaultConfigAsync();
    
    if (!config.projectContext) {
      throw new Error("No project context available. Make sure you're in a project directory.");
    }
    
    // Validate project name if provided
    if (projectName && (typeof projectName !== 'string' || !/^[a-zA-Z0-9-_]+$/.test(projectName))) {
      throw new Error("Invalid project name. Must contain only letters, numbers, hyphens, and underscores.");
    }
    
    const targetGraphId = projectName ? 
      `project-${projectName}` : 
      config.projectContext.groupId;
    
    const targetProjectName = projectName || config.projectContext.projectName;
    
    // Ensure group exists
    await ensureProjectGroup(targetGraphId, targetProjectName);
    
    // Add timestamp and attribution
    const timestampedMessage = `[${new Date().toISOString()}] ${message}`;
    
    // Add to project group
    await addToProjectGroup(targetGraphId, timestampedMessage, {
      sharedBy: config.userId,
      projectName: projectName || config.projectContext.projectName,
      timestamp: new Date().toISOString(),
      type: "shared_knowledge"
    });
    
    return {
      success: true,
      message: `✅ Knowledge shared to project: ${targetProjectName}\n📝 Message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"\n🔗 Graph ID: ${targetGraphId}\n👤 Shared by: ${config.userId}`,
      graphId: targetGraphId
    };
    
  } catch (error) {
    console.error("❌ Error sharing to project group:", error);
    return {
      success: false,
      message: `❌ Failed to share knowledge: ${(error as any).message}`
    };
  }
}

/**
 * Search both user and project graphs (combined search)
 */
export async function searchBothGraphs(
  query: string,
  graphId?: string,
  limit = 5
): Promise<{ personal: MemorySearchResult[]; project: MemorySearchResult[] }> {
  const personalResults = await searchMemory(query, "edges", limit);
  const projectResults = graphId ? 
    await searchProjectMemory(query, graphId, "edges", limit) : 
    [];

  return {
    personal: personalResults,
    project: projectResults
  };
}

/**
 * Enhanced Search Capabilities for Project Entities
 */

export interface ProjectPortfolioResult {
  projectId: string;
  projectName: string;
  organization?: string;
  technologies: string[];
  conversationCount: number;
  lastActivity: string;
  techExpertiseScore: number;
}

export interface TechnologyExpertiseResult {
  technology: string;
  confidenceScore: number;
  projectsUsing: string[];
  usageContext: string[];
  totalExperience: number;
}

/**
 * Search personal memories with project filtering
 */
export async function searchPersonalWithProjectFilter(
  query: string,
  projectId?: string,
  scope: "edges" | "nodes" | "episodes" = "episodes",
  limit = 5
): Promise<MemorySearchResult[]> {
  const client = createZepClient();
  const config = await getDefaultConfigAsync();
  const userId = config.userId || "developer";
  
  try {
    // If project filtering requested, modify query to include project context
    const enhancedQuery = projectId ? 
      `${query} project:${projectId}` : 
      query;
    
    const searchResults = await client.graph.search({
      userId,
      query: enhancedQuery,
      scope: scope as any,
      limit,
      reranker: "cross_encoder" as any
    });

    const results: MemorySearchResult[] = [];

    // Process results based on scope
    if (scope === 'edges' && searchResults?.edges) {
      for (const edge of searchResults.edges) {
        // Filter by project if specified
        if (projectId && !edge.fact?.includes(projectId)) {
          continue;
        }
        
        results.push({
          content: edge.fact || "Edge relation",
          score: edge.score ?? 0,
          type: "edge",
          created_at: edge.createdAt,
          metadata: {
            scope,
            uuid: edge.uuid,
            project_filtered: !!projectId,
            project_id: projectId,
            valid_at: edge.validAt,
            expired_at: edge.expiredAt,
            episodes: edge.episodes
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
            project_filtered: !!projectId,
            project_id: projectId,
            processed: episode.processed,
            role_type: episode.roleType,
            source: episode.source,
            session_id: episode.sessionId
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
            project_filtered: !!projectId,
            project_id: projectId,
            name: node.name,
            labels: node.labels,
            entity_type: node.labels?.includes("Location") ? "Project" : "unknown"
          }
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Search personal with project filter error:", error);
    return [];
  }
}

/**
 * Get project portfolio overview
 */
export async function getProjectPortfolio(): Promise<ProjectPortfolioResult[]> {
  const client = createZepClient();
  const config = await getDefaultConfigAsync();
  const userId = config.userId || "developer";
  
  try {
    // Search for all project entities (using Location labels)
    const projectResults = await client.graph.search({
      userId,
      query: "*",
      scope: 'nodes',
      searchFilters: {
        nodeLabels: ["Location"]
      },
      limit: 50
    });

    const portfolio: ProjectPortfolioResult[] = [];
    
    if (projectResults?.nodes) {
      for (const node of projectResults.nodes) {
        if (node.labels?.includes("Location")) {
          // Get project technologies from attributes
          const technologies = typeof node.attributes?.technologies === 'string' 
            ? node.attributes.technologies.split(", ") 
            : [];
          
          // Search for conversations in this project
          const conversationResults = await client.graph.search({
            userId,
            query: `OCCURS_IN ${node.name}`,
            scope: 'edges',
            limit: 50
          });
          
          const conversationCount = conversationResults?.edges?.length || 0;
          
          // Calculate tech expertise score based on technology count and confidence
          const techExpertiseScore = technologies.length > 0 ? 
            technologies.length * (typeof node.attributes?.overallConfidence === 'number' ? node.attributes.overallConfidence : 0.7) : 0;
          
          portfolio.push({
            projectId: typeof node.name === 'string' ? node.name : (typeof node.attributes?.name === 'string' ? node.attributes.name : "unknown"),
            projectName: typeof node.attributes?.displayName === 'string' ? node.attributes.displayName : (typeof node.name === 'string' ? node.name : "Unknown Project"),
            organization: typeof node.attributes?.organization === 'string' ? node.attributes.organization : undefined,
            technologies,
            conversationCount,
            lastActivity: typeof node.attributes?.lastUpdated === 'string' ? node.attributes.lastUpdated : (typeof node.createdAt === 'string' ? node.createdAt : "unknown"),
            techExpertiseScore: Math.round(techExpertiseScore * 100) / 100
          });
        }
      }
    }
    
    // Sort by tech expertise score and last activity
    return portfolio.sort((a, b) => {
      if (b.techExpertiseScore !== a.techExpertiseScore) {
        return b.techExpertiseScore - a.techExpertiseScore;
      }
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });
    
  } catch (error) {
    console.error("Get project portfolio error:", error);
    return [];
  }
}

/**
 * Get technology expertise analysis
 */
export async function getTechnologyExpertise(technology?: string): Promise<TechnologyExpertiseResult[]> {
  const client = createZepClient();
  const config = await getDefaultConfigAsync();
  const userId = config.userId || "developer";
  
  try {
    // Search for technology usage relationships
    const queryTerm = technology ? `USES ${technology}` : "USES";
    const technologyResults = await client.graph.search({
      userId,
      query: queryTerm,
      scope: 'edges',
      limit: 50
    });

    const techExpertise = new Map<string, TechnologyExpertiseResult>();
    
    if (technologyResults?.edges) {
      for (const edge of technologyResults.edges) {
        // Parse "project USES technology" facts
        const match = edge.fact?.match(/(.+)\s+USES\s+(.+)/);
        if (match && match[1] && match[2]) {
          const [, projectName, techName] = match;
          
          if (!techExpertise.has(techName)) {
            techExpertise.set(techName, {
              technology: techName,
              confidenceScore: 0,
              projectsUsing: [],
              usageContext: [],
              totalExperience: 0
            });
          }
          
          const expertise = techExpertise.get(techName)!;
          expertise.projectsUsing.push(projectName);
          expertise.confidenceScore = Math.max(expertise.confidenceScore, edge.score || 0);
          expertise.totalExperience += edge.score || 0;
          
          // Add context from episodes if available
          if (edge.episodes && edge.episodes.length > 0) {
            expertise.usageContext.push(`Used in ${edge.episodes.length} conversations`);
          }
        }
      }
    }

    // Convert to array and sort by total experience
    const results = Array.from(techExpertise.values()).sort((a, b) => 
      b.totalExperience - a.totalExperience
    );

    // If specific technology requested, filter to that technology
    return technology ? 
      results.filter(r => r.technology.toLowerCase().includes(technology.toLowerCase())) :
      results;
      
  } catch (error) {
    console.error("Get technology expertise error:", error);
    return [];
  }
}

/**
 * Analyze cross-project patterns
 */
export async function analyzeCrossProjectPatterns(
  pattern: string,
  limit = 10
): Promise<{
  pattern: string;
  projects: Array<{
    projectId: string;
    projectName: string;
    matches: MemorySearchResult[];
    relevanceScore: number;
  }>;
  totalMatches: number;
}> {
  const client = createZepClient();
  const config = await getDefaultConfigAsync();
  const userId = config.userId || "developer";
  
  try {
    // Search across all conversations and relationships for the pattern
    const patternResults = await client.graph.search({
      userId,
      query: pattern,
      scope: 'edges',
      limit: limit * 5 // Get more results to group by project
    });

    const projectMatches = new Map<string, {
      projectId: string;
      projectName: string;
      matches: MemorySearchResult[];
      relevanceScore: number;
    }>();

    if (patternResults?.edges) {
      for (const edge of patternResults.edges) {
        // Try to extract project context from the fact
        const projectMatch = edge.fact?.match(/(\w+-\w+-\w+)/); // Match project ID pattern
        const projectId = (projectMatch && projectMatch[1]) ? projectMatch[1] : "unknown";
        
        if (!projectMatches.has(projectId)) {
          projectMatches.set(projectId, {
            projectId,
            projectName: projectId.replace(/-/g, ' '),
            matches: [],
            relevanceScore: 0
          });
        }
        
        const project = projectMatches.get(projectId)!;
        project.matches.push({
          content: edge.fact || "Pattern match",
          score: edge.score ?? 0,
          type: "edge",
          created_at: edge.createdAt,
          metadata: {
            scope: "cross_project_analysis",
            uuid: edge.uuid,
            pattern_matched: pattern,
            project_id: projectId
          }
        });
        
        project.relevanceScore += edge.score ?? 0;
      }
    }

    const projects = Array.from(projectMatches.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    return {
      pattern,
      projects,
      totalMatches: patternResults?.edges?.length || 0
    };
    
  } catch (error) {
    console.error("Analyze cross-project patterns error:", error);
    return {
      pattern,
      projects: [],
      totalMatches: 0
    };
  }
}

/**
 * Search conversations specific to a project
 */
export async function searchProjectConversations(
  projectId: string,
  query?: string,
  limit = 10
): Promise<MemorySearchResult[]> {
  const client = createZepClient();
  const config = await getDefaultConfigAsync();
  const userId = config.userId || "developer";
  
  try {
    // Search for sessions that occurred in the project
    const sessionQuery = `OCCURS_IN ${projectId}`;
    const sessionResults = await client.graph.search({
      userId,
      query: sessionQuery,
      scope: 'edges',
      limit: 50
    });

    const sessionIds = new Set<string>();
    if (sessionResults?.edges) {
      for (const edge of sessionResults.edges) {
        // Extract session ID from facts like "session-abc123 OCCURS_IN project"
        const sessionMatch = edge.fact?.match(/session-([^\s]+)/);
        if (sessionMatch && sessionMatch[1]) {
          sessionIds.add(sessionMatch[1]);
        }
      }
    }

    // If we have specific query, search within project context
    if (query && sessionIds.size > 0) {
      const enhancedQuery = `${query} session:(${Array.from(sessionIds).join('|')})`;
      const queryResults = await client.graph.search({
        userId,
        query: enhancedQuery,
        scope: 'episodes',
        limit
      });

      if (queryResults?.episodes) {
        return queryResults.episodes.map(episode => ({
          content: episode.content || "Project conversation",
          score: episode.score ?? 0,
          type: "episode" as const,
          created_at: episode.createdAt,
          metadata: {
            scope: "project_conversations",
            uuid: episode.uuid,
            project_id: projectId,
            session_id: episode.sessionId,
            processed: episode.processed,
            role_type: episode.roleType
          }
        }));
      }
    }

    // Otherwise, return general project-related facts
    const projectResults = await client.graph.search({
      userId,
      query: projectId,
      scope: 'edges',
      limit
    });

    if (projectResults?.edges) {
      return projectResults.edges.map(edge => ({
        content: edge.fact || "Project relationship",
        score: edge.score ?? 0,
        type: "edge" as const,
        created_at: edge.createdAt,
        metadata: {
          scope: "project_facts",
          uuid: edge.uuid,
          project_id: projectId,
          valid_at: edge.validAt,
          expired_at: edge.expiredAt
        }
      }));
    }

    return [];
    
  } catch (error) {
    console.error("Search project conversations error:", error);
    return [];
  }
}

