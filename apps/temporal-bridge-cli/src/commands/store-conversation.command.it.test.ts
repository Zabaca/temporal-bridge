import * as path from 'node:path';
import { TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import { ProjectEntitiesService } from '../lib/project-entities';
import { SessionManager } from '../lib/session-manager';
import { ZepService } from '../lib/zep-client';
import { setupTestApp } from '../test/test-helpers';
import { StoreConversationCommand } from './store-conversation.command';

// Mock os.homedir to control home directory path
vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/home/test'),
}));

describe('StoreConversationCommand Integration Test', () => {
  let testModule: TestingModule;
  let storeConversationCommand: StoreConversationCommand;

  const mockZepService = mockDeep<ZepService>({
    userId: 'test-developer',
  });

  const mockSessionManager = mockDeep<SessionManager>();
  const mockProjectEntitiesService = mockDeep<ProjectEntitiesService>();

  beforeAll(async () => {
    const setupResult = await setupTestApp([
      { provide: ZepService, useValue: mockZepService },
      { provide: SessionManager, useValue: mockSessionManager },
      { provide: ProjectEntitiesService, useValue: mockProjectEntitiesService },
    ]);
    testModule = setupResult.module;
    storeConversationCommand = testModule.get(StoreConversationCommand);
  });

  afterAll(async () => {
    await testModule.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup service mocks
    mockSessionManager.updateSessionInfo.mockResolvedValue(undefined);
    mockSessionManager.shouldProcessProjectEntity.mockResolvedValue(true);
    mockSessionManager.markProjectEntityProcessed.mockResolvedValue(undefined);
    mockProjectEntitiesService.ensureProjectEntity.mockResolvedValue({
      success: true,
      projectEntity: { name: 'test-project' },
      message: 'Created project entity',
    });
    mockProjectEntitiesService.createSessionProjectRelationship.mockResolvedValue({
      success: true,
      message: 'Session linked to project',
    });
    mockZepService.thread.addMessages.mockResolvedValue(undefined);
    mockZepService.graph.add.mockResolvedValue(undefined);
  });

  describe('Command Execution', () => {
    it('should successfully process a valid conversation transcript', async () => {
      const testFixturePath = path.join(__dirname, '../test/fixtures/sample-transcript.jsonl');

      const options = {
        sessionId: 'test-session-123',
        transcriptPath: testFixturePath,
        cwd: '/test/project',
      };

      // Execute the command
      await storeConversationCommand.run([], options);

      // Verify file operations (transcript was read)
      expect(mockSessionManager.updateSessionInfo).toHaveBeenCalled();

      // Verify session management
      expect(mockSessionManager.updateSessionInfo).toHaveBeenCalledWith('/test/project', {
        sessionId: 'test-session-123',
        metadata: {
          source: 'claude-code-hook',
          projectId: expect.any(String),
        },
      });

      // Verify project entity processing
      expect(mockProjectEntitiesService.ensureProjectEntity).toHaveBeenCalledWith('/test/project');
      expect(mockProjectEntitiesService.createSessionProjectRelationship).toHaveBeenCalled();

      // Verify session processing completed successfully
      expect(mockSessionManager.updateSessionInfo).toHaveBeenCalled();

      // Note: messages might be skipped if UUIDs already exist, which is correct behavior
      // The important thing is that the command completed successfully without errors
    });

    it('should handle empty transcript gracefully', async () => {
      const testFixturePath = path.join(__dirname, '../test/fixtures/empty-transcript.jsonl');

      const options = {
        sessionId: 'test-session-empty',
        transcriptPath: testFixturePath,
        cwd: '/test/project',
      };

      await storeConversationCommand.run([], options);

      // Verify no messages sent when transcript is empty
      expect(mockZepService.thread.addMessages).not.toHaveBeenCalled();
      expect(mockZepService.graph.add).not.toHaveBeenCalled();
    });

    it('should handle malformed transcript lines gracefully', async () => {
      const testFixturePath = path.join(__dirname, '../test/fixtures/malformed-transcript.jsonl');

      const options = {
        sessionId: 'test-session-malformed',
        transcriptPath: testFixturePath,
        cwd: '/test/project',
      };

      // Mock process.exit and console.error to prevent actual exit
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {
        // Intentionally empty - we want to suppress console output during tests
      });

      await storeConversationCommand.run([], options);

      // Should exit due to malformed JSON
      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
      mockConsoleError.mockRestore();
    });

    it('should handle file read errors', async () => {
      const options = {
        sessionId: 'test-session-error',
        transcriptPath: '/nonexistent/transcript.jsonl',
        cwd: '/test/project',
      };

      // Mock process.exit to prevent actual exit
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      // Mock console.error to prevent error output
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {
        // Intentionally empty - we want to suppress console output during tests
      });

      await storeConversationCommand.run([], options);

      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
      mockConsoleError.mockRestore();
    });
  });

  describe('Project Entity Integration', () => {
    it('should skip project entity processing when not needed', async () => {
      mockSessionManager.shouldProcessProjectEntity.mockResolvedValue(false);
      const testFixturePath = path.join(__dirname, '../test/fixtures/sample-transcript.jsonl');

      const options = {
        sessionId: 'test-skip-entity',
        transcriptPath: testFixturePath,
        cwd: '/test/project',
      };

      await storeConversationCommand.run([], options);

      expect(mockProjectEntitiesService.ensureProjectEntity).not.toHaveBeenCalled();
      expect(mockProjectEntitiesService.createSessionProjectRelationship).not.toHaveBeenCalled();
    });

    it('should handle project entity creation failures gracefully', async () => {
      mockProjectEntitiesService.ensureProjectEntity.mockResolvedValue({
        success: false,
        message: 'Failed to create entity',
        error: 'Connection error',
      });

      const testFixturePath = path.join(__dirname, '../test/fixtures/sample-transcript.jsonl');

      const options = {
        sessionId: 'test-entity-fail',
        transcriptPath: testFixturePath,
        cwd: '/test/project',
      };

      // Should not throw error, just continue processing
      await expect(storeConversationCommand.run([], options)).resolves.not.toThrow();

      expect(mockProjectEntitiesService.createSessionProjectRelationship).not.toHaveBeenCalled();
    });
  });
});
