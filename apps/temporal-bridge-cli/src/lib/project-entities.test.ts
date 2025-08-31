import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import * as projectDetector from './project-detector';
import { ProjectEntitiesService } from './project-entities';
import { ZepService } from './zep-client';

// Mock the file system operations
vi.mock('node:fs', () => ({
  promises: {
    access: vi.fn(),
    readFile: vi.fn().mockResolvedValue('{}'),
  },
}));

// Mock path operations
vi.mock('node:path', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    resolve: vi.fn((...args) => args.join('/')),
    join: vi.fn((...args) => args.join('/')),
    dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/')),
    basename: vi.fn((p) => p.split('/').pop()),
  };
});

describe('ProjectEntitiesService', () => {
  let service: ProjectEntitiesService;
  let mockZepService: ReturnType<typeof mockDeep<ZepService>>;

  beforeEach(() => {
    mockZepService = mockDeep<ZepService>();
    service = new ProjectEntitiesService(mockZepService);

    // Mock project detector
    vi.spyOn(projectDetector, 'detectProject').mockResolvedValue({
      projectId: 'test-project',
      displayName: 'Test Project',
      organization: 'TestOrg',
      repository: 'https://github.com/test/test-project.git',
      projectType: 'git' as const,
      path: '/test/project',
    });

    vi.spyOn(projectDetector, 'detectProjectTechnologies').mockResolvedValue({
      technologies: [
        { name: 'TypeScript', confidence: 0.9, source: 'package.json' },
        { name: 'Node.js', confidence: 0.95, source: 'package.json' },
      ],
      summary: 'TypeScript Node.js project',
    });

    // Setup successful Zep responses
    mockZepService.graph.add.mockResolvedValue(undefined);
  });

  it('should create a project entity successfully', async () => {
    const result = await service.ensureProjectEntity('/test/project');

    expect(result.success).toBe(true);
    expect(result.projectEntity).toBeDefined();
    expect(result.projectEntity?.name).toBe('test-project');
    expect(result.projectEntity?.properties.technologies).toContain('TypeScript');
    expect(result.projectEntity?.properties.technologies).toContain('Node.js');
    expect(result.technologiesDetected).toBe(2);
  });

  it('should handle project detection errors gracefully', async () => {
    vi.spyOn(projectDetector, 'detectProject').mockRejectedValue(new Error('Project not found'));

    const result = await service.ensureProjectEntity('/nonexistent/project');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to create project entity: Project not found');
  });

  it('should create session-project relationships', async () => {
    const result = await service.createSessionProjectRelationship('claude-code-test-123', 'test-project', {
      metadata: { source: 'test' },
    });

    expect(result.success).toBe(true);
    expect(mockZepService.graph.add).toHaveBeenCalled();
  });
});
