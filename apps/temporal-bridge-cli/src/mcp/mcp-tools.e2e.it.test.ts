import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import { MemoryToolsService } from '../lib/memory-tools';
import { ProjectEntitiesService } from '../lib/project-entities';
import { SessionManager } from '../lib/session-manager';
import { ZepService } from '../lib/zep-client';
import { TemporalBridgeToolsService } from './temporal-bridge-tools.service';

// Mock os.homedir to control home directory path
vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/home/test'),
}));

describe('MCP Tools Integration Test', () => {
  let testModule: TestingModule;
  let temporalBridgeToolsService: TemporalBridgeToolsService;

  // Mock all external services using vitest-mock-extended
  const mockZepService = mockDeep<ZepService>({
    userId: 'test-developer',
  });

  const mockMemoryToolsService = mockDeep<MemoryToolsService>();
  const mockProjectEntitiesService = mockDeep<ProjectEntitiesService>();
  const mockSessionManager = mockDeep<SessionManager>();

  beforeAll(async () => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.ZEP_API_KEY = 'test-zep-api-key';
    process.env.DEVELOPER_ID = 'test-developer';

    // Create testing module with just the tools service and mocked dependencies
    const moduleBuilder = Test.createTestingModule({
      providers: [
        TemporalBridgeToolsService,
        { provide: ZepService, useValue: mockZepService },
        { provide: MemoryToolsService, useValue: mockMemoryToolsService },
        { provide: ProjectEntitiesService, useValue: mockProjectEntitiesService },
        { provide: SessionManager, useValue: mockSessionManager },
      ],
    });

    testModule = await moduleBuilder.compile();
    temporalBridgeToolsService = testModule.get(TemporalBridgeToolsService);
  });

  afterAll(async () => {
    await testModule.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('search_personal Tool', () => {
    it('should search personal memories and return formatted results', async () => {
      // Mock memory tools service response
      mockMemoryToolsService.searchMemory.mockResolvedValue([
        {
          content: 'I learned about TypeScript decorators today',
          score: 0.95,
          type: 'episode',
          created_at: '2024-01-01T10:00:00Z',
          metadata: { scope: 'personal', sessionId: 'test-session' },
        },
        {
          content: 'Debugging Node.js memory leaks using heapdump',
          score: 0.87,
          type: 'episode',
          created_at: '2024-01-01T09:00:00Z',
          metadata: { scope: 'personal', sessionId: 'test-session-2' },
        },
      ]);

      const result = await temporalBridgeToolsService.searchPersonal({
        query: 'TypeScript debugging',
        limit: 5,
        reranker: 'cross_encoder',
      });

      // Verify the service was called with correct parameters
      expect(mockMemoryToolsService.searchMemory).toHaveBeenCalledWith(
        'TypeScript debugging',
        'episodes',
        5,
        'cross_encoder',
      );

      // Verify the response format matches MCP tool expectations
      expect(result).toEqual({
        source: 'personal',
        query: 'TypeScript debugging',
        results: [
          {
            content: 'I learned about TypeScript decorators today',
            score: 0.95,
            type: 'episode',
            timestamp: '2024-01-01T10:00:00Z',
            metadata: { sessionId: 'test-session', scope: 'personal' },
          },
          {
            content: 'Debugging Node.js memory leaks using heapdump',
            score: 0.87,
            type: 'episode',
            timestamp: '2024-01-01T09:00:00Z',
            metadata: { sessionId: 'test-session-2', scope: 'personal' },
          },
        ],
      });
    });

    it('should handle empty search results gracefully', async () => {
      mockMemoryToolsService.searchMemory.mockResolvedValue([]);

      const result = await temporalBridgeToolsService.searchPersonal({
        query: 'nonexistent topic',
        limit: 3,
      });

      expect(result).toEqual({
        source: 'personal',
        query: 'nonexistent topic',
        results: [],
      });
    });
  });

  describe('search_project Tool', () => {
    it('should search project groups and return results', async () => {
      const result = await temporalBridgeToolsService.searchProject({
        query: 'project architecture',
        project: 'temporal-bridge',
        limit: 5,
      });

      // Project search now works but returns empty results for mock data
      expect(result).toEqual({
        source: 'project',
        query: 'project architecture',
        project: 'temporal-bridge',
        results: [],
      });
    });
  });

  describe('search_all Tool', () => {
    it('should combine personal and project search results', async () => {
      // Mock personal search results
      mockMemoryToolsService.searchMemory.mockResolvedValue([
        {
          content: 'Personal insight about React hooks',
          score: 0.92,
          type: 'episode',
          created_at: '2024-01-01T12:00:00Z',
          metadata: { scope: 'personal', sessionId: 'personal-session' },
        },
      ]);

      const result = await temporalBridgeToolsService.searchAll({
        query: 'React patterns',
        project: 'my-project',
        limit: 3,
        reranker: 'cross_encoder',
      });

      expect(result).toEqual({
        query: 'React patterns',
        project: 'my-project',
        personal: [
          {
            content: 'Personal insight about React hooks',
            score: 0.92,
            type: 'episode',
            timestamp: '2024-01-01T12:00:00Z',
            metadata: { sessionId: 'personal-session', scope: 'personal' },
          },
        ],
        project_results: [], // Empty because project search is not implemented
      });
    });
  });

  describe('get_recent_episodes Tool', () => {
    it('should retrieve recent conversation episodes', async () => {
      mockMemoryToolsService.searchMemory.mockResolvedValue([
        {
          content: 'Recent conversation about testing patterns',
          score: 1.0,
          type: 'episode',
          created_at: '2024-01-01T15:00:00Z',
          metadata: { scope: 'personal', sessionId: 'recent-session' },
        },
      ]);

      const result = await temporalBridgeToolsService.getRecentEpisodes({
        limit: 10,
      });

      expect(mockMemoryToolsService.searchMemory).toHaveBeenCalledWith('*', 'episodes', 10);

      expect(result).toEqual({
        episodes: [
          {
            content: 'Recent conversation about testing patterns',
            score: 1.0,
            timestamp: '2024-01-01T15:00:00Z',
            metadata: { scope: 'personal', sessionId: 'recent-session' },
          },
        ],
        count: 1,
      });
    });
  });

  describe('get_current_context Tool', () => {
    it('should get current project context', async () => {
      mockProjectEntitiesService.getCurrentProjectContext.mockResolvedValue({
        success: true,
        project: {
          projectId: 'temporal-bridge',
          projectName: 'temporal-bridge',
          projectPath: '/test/temporal-bridge',
          technologies: ['TypeScript', 'Node.js'],
          sessionCount: 5,
        },
      });

      const result = await temporalBridgeToolsService.getCurrentContext();

      expect(mockProjectEntitiesService.getCurrentProjectContext).toHaveBeenCalled();

      expect(result).toEqual({
        success: true,
        project: {
          projectId: 'temporal-bridge',
          projectName: 'temporal-bridge',
          projectPath: '/test/temporal-bridge',
          technologies: ['TypeScript', 'Node.js'],
          sessionCount: 5,
        },
        timestamp: expect.any(String), // ISO timestamp
      });
    });

    it('should handle project context errors', async () => {
      mockProjectEntitiesService.getCurrentProjectContext.mockResolvedValue({
        success: false,
        error: 'Project not found',
      });

      const result = await temporalBridgeToolsService.getCurrentContext();

      expect(result).toEqual({
        success: false,
        project: undefined,
        error: 'Project not found',
        timestamp: expect.any(String),
      });
    });
  });

  describe('share_knowledge Tool', () => {
    it('should share knowledge to project group', async () => {
      mockMemoryToolsService.shareToProjectGroup.mockResolvedValue({
        success: true,
        message: 'Knowledge shared successfully',
        graphId: 'project-zabaca-temporal-bridge',
      });

      const result = await temporalBridgeToolsService.shareKnowledge({
        message: 'We decided to use Vitest for testing because of better TypeScript support',
        project: 'temporal-bridge',
      });

      expect(mockMemoryToolsService.shareToProjectGroup).toHaveBeenCalledWith(
        'We decided to use Vitest for testing because of better TypeScript support',
        'temporal-bridge',
      );

      expect(result).toEqual({
        success: true,
        message: 'Knowledge shared successfully',
        graphId: 'project-zabaca-temporal-bridge',
      });
    });
  });

  describe('list_projects Tool', () => {
    it('should list all project entities', async () => {
      mockProjectEntitiesService.listProjectEntities.mockResolvedValue({
        success: true,
        projects: [
          {
            name: 'temporal-bridge',
            attributes: { displayName: 'TemporalBridge', technologies: 'TypeScript, Node.js' },
          },
          {
            name: 'my-web-app',
            attributes: { displayName: 'My Web App', technologies: 'React, TypeScript' },
          },
        ],
        count: 2,
      });

      const result = await temporalBridgeToolsService.listProjects();

      expect(mockProjectEntitiesService.listProjectEntities).toHaveBeenCalled();

      expect(result).toEqual({
        success: true,
        projects: [
          {
            name: 'temporal-bridge',
            attributes: { displayName: 'TemporalBridge', technologies: 'TypeScript, Node.js' },
          },
          {
            name: 'my-web-app',
            attributes: { displayName: 'My Web App', technologies: 'React, TypeScript' },
          },
        ],
        count: 2,
        error: undefined,
      });
    });
  });

  describe('project_technologies Tool', () => {
    it('should get technology information for specific project', async () => {
      mockProjectEntitiesService.getProjectEntity.mockResolvedValue({
        success: true,
        technologies: ['TypeScript', 'Node.js', 'NestJS'],
        entity: {
          name: 'temporal-bridge',
          attributes: { technologies: 'TypeScript, Node.js, NestJS' },
        },
      });

      const result = await temporalBridgeToolsService.projectTechnologies({
        projectId: 'temporal-bridge',
      });

      expect(mockProjectEntitiesService.getProjectEntity).toHaveBeenCalledWith('temporal-bridge');

      expect(result).toEqual({
        success: true,
        projectId: 'temporal-bridge',
        technologies: ['TypeScript', 'Node.js', 'NestJS'],
        entity: {
          name: 'temporal-bridge',
          attributes: { technologies: 'TypeScript, Node.js, NestJS' },
        },
        error: undefined,
      });
    });
  });

  describe('get_technology_expertise Tool', () => {
    it('should analyze technology expertise across all projects', async () => {
      mockProjectEntitiesService.listProjectEntities.mockResolvedValue({
        success: true,
        projects: [
          {
            name: 'project-1',
            attributes: { technologies: 'TypeScript, React' },
          },
          {
            name: 'project-2',
            attributes: { technologies: 'TypeScript, Node.js' },
          },
        ],
        count: 2,
      });

      const result = await temporalBridgeToolsService.getTechnologyExpertise({
        technology: 'TypeScript',
      });

      expect(result).toEqual({
        success: true,
        technology: 'TypeScript',
        expertise: {
          TypeScript: {
            count: 2,
            projects: ['project-1', 'project-2'],
          },
        },
        totalProjects: 2,
      });
    });

    it('should analyze all technologies when none specified', async () => {
      mockProjectEntitiesService.listProjectEntities.mockResolvedValue({
        success: true,
        projects: [
          {
            name: 'project-1',
            attributes: { technologies: 'TypeScript, React' },
          },
        ],
        count: 1,
      });

      const result = await temporalBridgeToolsService.getTechnologyExpertise({});

      expect(result.expertise).toEqual({
        TypeScript: { count: 1, projects: ['project-1'] },
        React: { count: 1, projects: ['project-1'] },
      });
    });
  });

  describe('get_thread_context Tool', () => {
    it('should return placeholder for thread context functionality', async () => {
      const result = await temporalBridgeToolsService.getThreadContext({
        thread_id: 'claude-code-session-123',
        min_rating: 0.8,
      });

      expect(result).toEqual({
        thread_id: 'claude-code-session-123',
        context_summary: 'Thread context functionality will be implemented with Zep thread integration',
        facts: [],
        user_id: 'developer',
        message: 'Thread context retrieval not yet implemented',
      });
    });
  });

  describe('MCP Tool Error Handling', () => {
    it('should handle service errors gracefully in search_personal', async () => {
      mockMemoryToolsService.searchMemory.mockRejectedValue(new Error('Zep API connection failed'));

      await expect(
        temporalBridgeToolsService.searchPersonal({
          query: 'test query',
          limit: 5,
        }),
      ).rejects.toThrow('Zep API connection failed');
    });

    it('should handle service errors gracefully in share_knowledge', async () => {
      mockMemoryToolsService.shareToProjectGroup.mockResolvedValue({
        success: false,
        message: 'Failed to share knowledge: API rate limit exceeded',
      });

      const result = await temporalBridgeToolsService.shareKnowledge({
        message: 'Test knowledge sharing',
      });

      expect(result).toEqual({
        success: false,
        message: 'Failed to share knowledge: API rate limit exceeded',
        graphId: undefined,
      });
    });
  });
});
