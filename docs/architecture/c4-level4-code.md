```mermaid
---
title: "C4 Level 4: Code - Memory Search Implementation"
---
classDiagram
    %% Interfaces
    class UnifiedMemoryQuery {
        <<interface>>
        +string query?
        +string threadId?
        +string userId?
        +number limit?
        +SearchScope searchScope?
        +number minRating?
        +Reranker reranker?
    }
    
    class UnifiedMemoryResult {
        <<interface>>
        +string content
        +number score?
        +string timestamp?
        +ResultType type
        +SearchMetadata metadata
    }
    
    class SearchMetadata {
        <<interface>>
        +string scope?
        +string thread_id?
        +string episode_id?
        +string source?
        +boolean processed?
        +string status?
        +string role?
    }
    
    class CombinedSearchResponse {
        <<interface>>
        +string query
        +string project?
        +UnifiedMemoryResult[] personal
        +UnifiedMemoryResult[] project_results
    }
    
    %% Core Service Classes
    class MemoryToolsService {
        <<service>>
        -ZepService zepService
        -ProjectDetector projectDetector
        -SessionManager sessionManager
        +searchPersonal(query: UnifiedMemoryQuery) Promise~UnifiedMemoryResult[]~
        +searchProject(query: UnifiedMemoryQuery) Promise~UnifiedMemoryResult[]~
        +searchAll(query: UnifiedMemoryQuery) Promise~CombinedSearchResponse~
        +shareKnowledge(message: string, project?: string) Promise~ShareResult~
        +getRecentEpisodes(limit: number) Promise~UnifiedMemoryResult[]~
        -searchMemory(query: UnifiedMemoryQuery, scope: string) Promise~UnifiedMemoryResult[]~
        -buildSearchQuery(query: UnifiedMemoryQuery) ZepSearchQuery
        -processSearchResults(results: ZepSearchResponse, source: string) UnifiedMemoryResult[]
    }
    
    class ZepService {
        <<service>>
        +string userId
        +ZepGraphService graph
        +ZepMemoryService memory
        +ensureUser(userId?: string) Promise~void~
        +ensureThread(threadId: string, userId?: string) Promise~void~
    }
    
    class ZepGraphService {
        <<service>>
        +search(query: ZepGraphSearchQuery) Promise~ZepGraphSearchResponse~
        +add(data: ZepGraphAddRequest) Promise~ZepGraphAddResponse~
    }
    
    class ZepMemoryService {
        <<service>>
        +search(sessionId: string, query: ZepMemorySearchQuery) Promise~ZepMemorySearchResponse~
        +addMessages(sessionId: string, messages: ZepMessage[]) Promise~void~
    }
    
    class ProjectDetector {
        <<service>>
        +detectProject(projectPath?: string) Promise~ProjectContext~
        +detectProjectTechnologies(projectPath: string) Promise~TechnologyDetectionResult~
        -walkDir(dir: string, extensions: Set~string~) Promise~string[]~
        -analyzePackageJson(path: string) TechnologyDetection[]
        -analyzeFileExtensions(files: string[]) TechnologyDetection[]
        -calculateConfidenceScores(detections: TechnologyDetection[]) number
    }
    
    %% Enums/Types
    class SearchScope {
        <<enumeration>>
        edges
        nodes
        episodes
    }
    
    class Reranker {
        <<enumeration>>
        cross_encoder
        none
    }
    
    class ResultType {
        <<enumeration>>
        graph_search
        user_context
        recent_episodes
        current_context
    }
    
    %% Relationships
    MemoryToolsService --> ZepService : uses
    MemoryToolsService --> ProjectDetector : uses
    MemoryToolsService ..> UnifiedMemoryQuery : accepts
    MemoryToolsService ..> UnifiedMemoryResult : returns
    MemoryToolsService ..> CombinedSearchResponse : returns
    
    ZepService --> ZepGraphService : contains
    ZepService --> ZepMemoryService : contains
    
    UnifiedMemoryResult --> SearchMetadata : contains
    UnifiedMemoryQuery --> SearchScope : uses
    UnifiedMemoryQuery --> Reranker : uses
    UnifiedMemoryResult --> ResultType : uses
    
    CombinedSearchResponse --> UnifiedMemoryResult : contains
```

## Core Search Algorithm Flow

The MemoryToolsService implements a sophisticated search pipeline:

1. **Query Parsing & Validation** - Parse UnifiedMemoryQuery parameters and validate inputs
2. **Project Context Detection** - Use ProjectDetector to identify current project context
3. **Search Query Building** - Transform query into Zep-compatible search parameters with filters
4. **Scope-based Execution** - Execute search against personal user graph or project groups
5. **Result Processing & Ranking** - Process raw Zep responses into structured results
6. **Reranking (Optional)** - Apply cross-encoder reranking for improved relevance
7. **Result Formatting** - Return as UnifiedMemoryResult[] with rich metadata

## API Integration Strategy

The ZepService provides a unified interface to Zep Cloud:

- **Single User Identity** - All projects use same developer ID for cross-project learning
- **Thread Management** - Automatic user/thread creation for conversations
- **Dual Search APIs** - Graph search for relationships, memory search for episodes  
- **Error Handling** - Robust error handling with automatic retry logic
- **Type Safety** - Full TypeScript integration with proper interfaces

## Technology Detection Pipeline

The ProjectDetector analyzes projects systematically:

1. **Package.json Analysis** - Extract dependencies, devDependencies, scripts
2. **File Extension Scanning** - Recursive directory walk with pattern matching
3. **Framework Detection** - Identify Next.js, Vue, Angular, etc. configurations
4. **Confidence Calculation** - Weighted scoring based on detection strength
5. **Threshold Filtering** - Remove low-confidence detections
6. **Sorted Results** - Return technologies ranked by confidence and usage