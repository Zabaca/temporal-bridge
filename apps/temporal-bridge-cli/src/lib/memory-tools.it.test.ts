import { TestingModule } from '@nestjs/testing';
import { setupTestApp } from '../test/test-helpers';
import { MemoryToolsService } from './memory-tools';
import { ZepService } from './zep-client';
import {mock, mockDeep} from "jest-mock-extended";
import * as Zep from "@getzep/zep-cloud/dist/cjs/api";

describe('MemoryToolsService Integration Test', () => {
  let testModule: TestingModule;
  let memoryToolsService: MemoryToolsService;

  // Mock external services - Zep should not make real API calls in tests
  const mockZepService = mockDeep<ZepService>({
    userId: 'test-developer',
  })

  beforeAll(async () => {
    const setupResult = await setupTestApp([
      { provide: ZepService, useValue: mockZepService },
    ]);
    testModule = setupResult.module;
    memoryToolsService = testModule.get(MemoryToolsService);
  });

  afterAll(async () => {
    await testModule.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchFacts() - Simple Integration Test', () => {
    it('should search facts using mocked Zep graph.search', async () => {
      // Mock the return value for this specific test
      const mockSearchResults =  mockDeep<Zep.GraphSearchResults>({
        edges: [
          {
            fact: 'developer USES TypeScript',
            score: 0.95,
            createdAt: '2024-01-01T00:00:00Z',
            episodes: ['episode-123'],
            expiredAt: undefined,
            validAt: undefined,
          },
        ],
      });

      // Configure the mock to return our test data
      mockZepService.graph.search.mockResolvedValue(mockSearchResults);

      const result = await memoryToolsService.searchFacts('TypeScript', 5);

      // Debug: Check if mock was called
      expect(mockZepService.graph.search).toHaveBeenCalled();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      console.log(result[0])
      expect(result[0]).toMatchObject({
        fact: 'developer USES TypeScript',
        score: 0.95,
        created_at: '2024-01-01T00:00:00Z',
        expired_at: undefined,
        valid_at: undefined,
        source_episodes: ['episode-123'],
      });

      // Verify the correct method was called with correct parameters
      expect(mockZepService.graph.search).toHaveBeenCalledWith({
        userId: 'test-developer',
        query: 'TypeScript',
        scope: 'edges',
        limit: 5,
        reranker: undefined,
      });
    });
  });
});