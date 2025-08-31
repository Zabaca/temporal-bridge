import { vi, describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestingModule } from '@nestjs/testing';
import { mockDeep } from 'vitest-mock-extended';
import { setupTestApp } from '../test/test-helpers';
import { MemoryToolsService } from './memory-tools';
import { ZepService } from './zep-client';
import type * as Zep from '@getzep/zep-cloud/dist/cjs/api';
import {createMock} from "@golevelup/ts-vitest";

describe('MemoryToolsService Integration Test', () => {
  let testModule: TestingModule;
  let memoryToolsService: MemoryToolsService;

  // Mock external services using vitest-mock-extended - same API as jest-mock-extended!
  const mockZepService = mockDeep<ZepService>({
    userId: 'test-developer',
  });

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
    vi.clearAllMocks();
  });

  describe('searchFacts() - Simple Integration Test', () => {
    it('should search facts using native Vitest mocking', async () => {
      // Create mock search results as plain object (no proxies!)
     const mockSearchResults  = createMock<Zep.GraphSearchResults>({
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

      mockZepService.graph.search.mockResolvedValue(mockSearchResults);

      const result = await memoryToolsService.searchFacts('TypeScript', 5);

      // Debug: Check if mock was called
      expect(mockZepService.graph.search).toHaveBeenCalled();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      console.log(result[0])
      // Test individual properties first
      expect(result[0].fact).toBe('developer USES TypeScript');
      expect(result[0].score).toBe(0.95);
      expect(result[0].source_episodes).toEqual(['episode-123']);
      
      // Now test full object equality - should work perfectly in Vitest!
      expect(result[0]).toEqual({
        fact: 'developer USES TypeScript',
        score: 0.95,
        created_at: '2024-01-01T00:00:00Z',
        expired_at: undefined,
        valid_at: undefined,
        source_episodes: ['episode-123'],
      });
      
      // Even toStrictEqual should work in Vitest (unlike Jest with proxies)
      expect(result[0]).toStrictEqual({
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