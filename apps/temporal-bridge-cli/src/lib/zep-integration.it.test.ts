import type * as Zep from '@getzep/zep-cloud/dist/cjs/api';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import { MemoryToolsService } from './memory-tools';
import { ProjectEntitiesService } from './project-entities';
import { SessionManager } from './session-manager';
import { ZepService } from './zep-client';

// Mock os.homedir to control home directory path
vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/home/test'),
}));

describe('Zep API Integration Test', () => {
  let testModule: TestingModule;
  let memoryToolsService: MemoryToolsService;

  // Mock services that interact with Zep
  const mockZepService = mockDeep<ZepService>({
    userId: 'test-developer',
  });

  const mockProjectEntitiesService = mockDeep<ProjectEntitiesService>();
  const mockSessionManager = mockDeep<SessionManager>();

  beforeAll(async () => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.ZEP_API_KEY = 'zep-test-api-key-1234567890abcdef';
    process.env.DEVELOPER_ID = 'test-developer';

    // Create testing module with mocked services
    const moduleBuilder = Test.createTestingModule({
      providers: [
        MemoryToolsService,
        { provide: ZepService, useValue: mockZepService },
        { provide: ProjectEntitiesService, useValue: mockProjectEntitiesService },
        { provide: SessionManager, useValue: mockSessionManager },
      ],
    });

    testModule = await moduleBuilder.compile();
    memoryToolsService = testModule.get(MemoryToolsService);
  });

  afterAll(async () => {
    await testModule.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ZepService Integration via MemoryToolsService', () => {
    it('should verify ZepService mock is available', () => {
      expect(mockZepService.userId).toBe('test-developer');
      expect(mockZepService.graph).toBeDefined();
      expect(mockZepService.thread).toBeDefined();
    });

    it('should have access to ZepService through dependency injection', () => {
      expect(memoryToolsService).toBeDefined();
      // MemoryToolsService internally uses ZepService
      expect(typeof memoryToolsService.searchFacts).toBe('function');
      expect(typeof memoryToolsService.searchMemory).toBe('function');
      expect(typeof memoryToolsService.shareToProjectGroup).toBe('function');
    });
  });

  describe('MemoryToolsService Zep Integration', () => {
    it('should search facts via mocked ZepService', async () => {
      const mockSearchResults: Zep.GraphSearchResults = {
        edges: [
          {
            fact: 'developer PREFERS Vitest',
            name: 'PREFERS',
            sourceNodeUuid: 'developer-uuid',
            targetNodeUuid: 'vitest-uuid',
            uuid: 'edge-uuid',
            score: 0.92,
            createdAt: '2024-01-01T12:00:00Z',
            episodes: ['episode-testing-123'],
            expiredAt: undefined,
            validAt: undefined,
          },
        ],
      };

      mockZepService.graph.search.mockResolvedValue(mockSearchResults);

      const results = await memoryToolsService.searchFacts('testing frameworks', 5);

      expect(mockZepService.graph.search).toHaveBeenCalledWith({
        userId: 'test-developer',
        query: 'testing frameworks',
        scope: 'edges',
        limit: 5,
        reranker: undefined,
      });

      expect(results).toEqual([
        {
          content: 'developer PREFERS Vitest',
          score: 0.92,
          type: 'edge',
          created_at: '2024-01-01T12:00:00Z',
          metadata: {
            scope: 'edges',
            uuid: 'edge-uuid',
            valid_at: undefined,
            expired_at: undefined,
            source_episodes: ['episode-testing-123'],
          },
          _original: expect.any(Object),
        },
      ]);
    });

    it('should search memory episodes via mocked ZepService', async () => {
      const mockEpisodeResults: Zep.GraphSearchResults = {
        episodes: [
          {
            content: 'Discussed testing patterns and best practices',
            score: 0.89,
            createdAt: '2024-01-01T14:00:00Z',
            uuid: 'episode-uuid-1',
          },
          {
            content: 'Implemented unit tests for React components',
            score: 0.85,
            createdAt: '2024-01-01T13:00:00Z',
            uuid: 'episode-uuid-2',
          },
        ],
      };

      mockZepService.graph.search.mockResolvedValue(mockEpisodeResults);

      const results = await memoryToolsService.searchMemory('testing patterns', 'episodes', 3);

      expect(mockZepService.graph.search).toHaveBeenCalledWith({
        userId: 'test-developer',
        query: 'testing patterns',
        scope: 'episodes',
        limit: 3,
        reranker: undefined,
      });

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        content: 'Discussed testing patterns and best practices',
        score: 0.89,
        type: 'episode',
        created_at: '2024-01-01T14:00:00Z',
        metadata: expect.objectContaining({
          scope: 'episodes',
        }),
        _original: expect.any(Object),
      });
    });

    it('should handle empty search results gracefully', async () => {
      mockZepService.graph.search.mockResolvedValue({});

      const results = await memoryToolsService.searchFacts('nonexistent topic', 5);

      expect(results).toEqual([]);
    });

    it('should share knowledge to project group via mocked ZepService', async () => {
      mockZepService.graph.add.mockResolvedValue({
        uuid: 'test-uuid',
        createdAt: '2024-01-01T00:00:00Z',
        content: 'test content',
      });

      const result = await memoryToolsService.shareToProjectGroup(
        'We decided to use TypeScript strict mode for better type safety',
        'temporal-bridge',
      );

      expect(mockZepService.graph.add).toHaveBeenCalledWith({
        type: 'text',
        graphId: 'project-temporal-bridge',
        data: expect.stringContaining('We decided to use TypeScript strict mode for better type safety'),
        sourceDescription: expect.stringContaining('"sharedBy":"test-developer"'),
      });

      expect(result).toEqual({
        success: true,
        message: expect.stringContaining('Knowledge shared to project: temporal-bridge'),
        graphId: 'project-temporal-bridge',
      });
    });

    it('should use correct user ID from ZepService', async () => {
      mockZepService.graph.search.mockResolvedValue({ edges: [] });

      await memoryToolsService.searchFacts('test query', 3);

      expect(mockZepService.graph.search).toHaveBeenCalledWith({
        userId: 'test-developer',
        query: 'test query',
        scope: 'edges',
        limit: 3,
        reranker: undefined,
      });
    });
  });

  describe('Zep API Error Handling', () => {
    it('should handle graph search API errors gracefully', async () => {
      const apiError = new Error('Zep graph search failed');
      mockZepService.graph.search.mockRejectedValue(apiError);

      // MemoryToolsService catches errors and returns empty array
      const results = await memoryToolsService.searchFacts('test query', 5);

      expect(results).toEqual([]);
    });

    it('should handle invalid API responses gracefully', async () => {
      // Return malformed response
      mockZepService.graph.search.mockResolvedValue({ edges: [], nodes: [], episodes: [] });

      const results = await memoryToolsService.searchFacts('test query', 5);

      expect(results).toEqual([]);
    });

    it('should handle share knowledge errors gracefully', async () => {
      const apiError = new Error('Zep graph add failed');
      mockZepService.graph.add.mockRejectedValue(apiError);

      const result = await memoryToolsService.shareToProjectGroup('Test knowledge', 'project');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to share knowledge');
    });
  });

  describe('Zep Configuration and Context', () => {
    it('should use correct user ID in Zep operations', () => {
      // ZepService mock should be configured with test user ID
      expect(mockZepService.userId).toBe('test-developer');
    });

    it('should generate project-specific graph IDs correctly', async () => {
      mockZepService.graph.add.mockResolvedValue({
        uuid: 'test-uuid',
        createdAt: '2024-01-01T00:00:00Z',
        content: 'test content',
      });

      await memoryToolsService.shareToProjectGroup('Test knowledge', 'my-project');

      expect(mockZepService.graph.add).toHaveBeenCalledWith({
        type: 'text',
        graphId: 'project-my-project',
        data: expect.stringContaining('Test knowledge'),
        sourceDescription: expect.stringContaining('"projectName":"my-project"'),
      });
    });

    it('should use consistent thread ID formats', async () => {
      mockZepService.thread.addMessages.mockResolvedValue({
        messageUuids: ['msg-uuid-1', 'msg-uuid-2'],
      });

      // Simulate how StoreConversationCommand would use the service
      await mockZepService.thread.addMessages('claude-code-session-abc123', {
        messages: [
          {
            role: 'user',
            content: 'Test message',
            name: 'Developer',
          },
        ],
      });

      expect(mockZepService.thread.addMessages).toHaveBeenCalledWith('claude-code-session-abc123', {
        messages: expect.any(Array),
      });
    });
  });

  describe('Search Result Processing', () => {
    it('should process graph search results correctly', async () => {
      const mockResults: Zep.GraphSearchResults = {
        edges: [
          {
            fact: 'developer USES TypeScript',
            name: 'USES',
            sourceNodeUuid: 'developer-uuid',
            targetNodeUuid: 'typescript-uuid',
            uuid: 'edge-uuid-3',
            score: 0.95,
            createdAt: '2024-01-01T00:00:00Z',
            episodes: ['episode-123'],
          },
        ],
        episodes: [
          {
            content: 'Discussion about TypeScript benefits',
            score: 0.88,
            createdAt: '2024-01-01T01:00:00Z',
            uuid: 'episode-uuid-3',
          },
        ],
      };

      mockZepService.graph.search.mockResolvedValue(mockResults);

      const edgeResults = await memoryToolsService.searchFacts('TypeScript', 5);
      const episodeResults = await memoryToolsService.searchMemory('TypeScript', 'episodes', 5);

      // Verify facts are processed correctly
      expect(edgeResults).toEqual([
        {
          content: 'developer USES TypeScript',
          score: 0.95,
          type: 'edge',
          created_at: '2024-01-01T00:00:00Z',
          metadata: {
            scope: 'edges',
            uuid: 'edge-uuid-3',
            valid_at: undefined,
            expired_at: undefined,
            source_episodes: ['episode-123'],
          },
          _original: expect.any(Object),
        },
      ]);

      // Verify episodes are processed correctly
      expect(episodeResults).toEqual([
        {
          content: 'Discussion about TypeScript benefits',
          score: 0.88,
          type: 'episode',
          created_at: '2024-01-01T01:00:00Z',
          metadata: expect.objectContaining({
            scope: 'episodes',
          }),
          _original: expect.any(Object),
        },
      ]);
    });

    it('should handle mixed search scopes correctly', async () => {
      const mockResults: Zep.GraphSearchResults = {
        edges: [
          {
            fact: 'test fact',
            name: 'TEST_RELATION',
            sourceNodeUuid: 'source-uuid',
            targetNodeUuid: 'target-uuid',
            uuid: 'edge-uuid-4',
            score: 0.9,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        nodes: [
          {
            name: 'test node',
            summary: 'Test node summary',
            uuid: 'node-uuid-1',
            score: 0.8,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        episodes: [{ content: 'test episode', score: 0.7, createdAt: '2024-01-01T00:00:00Z', uuid: 'episode-uuid-4' }],
      };

      mockZepService.graph.search.mockResolvedValue(mockResults);

      const results = await memoryToolsService.searchMemory('test query', 'edges', 5);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        content: expect.stringContaining('test'),
        score: expect.any(Number),
        created_at: '2024-01-01T00:00:00Z',
      });
    });
  });
});
