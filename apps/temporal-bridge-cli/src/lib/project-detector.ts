/**
 * Project Context Detection for TemporalBridge
 * Automatically detects project context for memory isolation
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import type { TechnologyDetection, TechnologyDetectionResult } from './types';

export interface ProjectContext {
  /** Unique project identifier for Zep group scoping */
  projectId: string;
  /** Group ID for Zep group graphs */
  groupId: string;
  /** Full path to project root */
  projectPath: string;
  /** Git remote URL if available */
  gitRemote?: string;
  /** Human-readable project name */
  projectName: string;
  /** Project type detection */
  projectType: 'git' | 'directory' | 'unknown';
  /** Organization/namespace if detected */
  organization?: string;
}

/**
 * Find git root directory by walking up the filesystem
 */
async function findGitRoot(startPath: string): Promise<string | null> {
  let currentPath = resolve(startPath);

  while (currentPath !== dirname(currentPath)) {
    const gitPath = resolve(currentPath, '.git');
    if (existsSync(gitPath)) {
      return currentPath;
    }
    currentPath = dirname(currentPath);
  }

  return null;
}

/**
 * Parse organization and repository name from git remote URL
 */
function parseGitRemote(remoteUrl: string): { organization?: string; name?: string; url: string } {
  // Common git remote URL patterns:
  // https://github.com/org/repo.git
  // git@github.com:org/repo.git
  // https://gitlab.com/org/repo.git
  // git@gitlab.com:org/repo.git
  // https://bitbucket.org/org/repo.git

  let organization: string | undefined;
  let name: string | undefined;

  try {
    // Handle SSH format: git@host:org/repo.git
    const sshMatch = remoteUrl.match(/^git@([^:]+):([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (sshMatch) {
      organization = sshMatch[2];
      name = sshMatch[3];
      return { organization, name, url: remoteUrl };
    }

    // Handle HTTPS format: https://host/org/repo.git
    const httpsMatch = remoteUrl.match(/^https?:\/\/[^/]+\/([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (httpsMatch) {
      organization = httpsMatch[1];
      name = httpsMatch[2];
      return { organization, name, url: remoteUrl };
    }

    // Handle nested paths: https://host/group/subgroup/repo.git
    const nestedMatch = remoteUrl.match(/^https?:\/\/[^/]+\/(.+?)\/([^/]+?)(?:\.git)?$/);
    if (nestedMatch?.[1] && nestedMatch[2]) {
      // For nested paths, use the last segment as org and repo
      const pathParts = nestedMatch[1].split('/');
      organization = pathParts[pathParts.length - 1]; // Last group as org
      name = nestedMatch[2];
      return { organization, name, url: remoteUrl };
    }
  } catch (_error) {
    // Fall back to returning just the URL
  }

  return { url: remoteUrl };
}

/**
 * Execute git command and return output
 */
function executeGitCommand(args: string[], cwd: string): Promise<string | null> {
  return new Promise((resolve) => {
    const git = spawn('git', args, { cwd, stdio: 'pipe' });
    let stdout = '';

    git.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    git.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        resolve(null);
      }
    });

    git.on('error', () => {
      resolve(null);
    });
  });
}

/**
 * Get git remote URL and extract repository information
 */
async function getGitRemoteInfo(
  gitRoot: string,
): Promise<{ organization?: string; name?: string; url?: string } | null> {
  try {
    const remote = await executeGitCommand(['remote', 'get-url', 'origin'], gitRoot);

    if (remote) {
      return parseGitRemote(remote);
    }
  } catch (_error) {
    // Git not available or no remote
  }

  return null;
}

/**
 * Validate git repository and get additional info
 */
async function validateGitRepo(gitRoot: string): Promise<{ isValid: boolean; hasCommits: boolean }> {
  try {
    const commitCount = await executeGitCommand(['rev-list', '--count', 'HEAD'], gitRoot);

    if (commitCount !== null) {
      const count = Number.parseInt(commitCount);
      return { isValid: true, hasCommits: count > 0 };
    }
  } catch (_error) {
    // Repository might be in initial state
  }

  return { isValid: true, hasCommits: false }; // Assume valid if .git exists
}

/**
 * Parse project info from package.json or deno.json
 */
async function parseProjectConfig(projectPath: string): Promise<{ name?: string; organization?: string }> {
  const configs = ['package.json', 'deno.json', 'deno.jsonc'];

  for (const configFile of configs) {
    const configPath = resolve(projectPath, configFile);

    if (existsSync(configPath)) {
      try {
        const content = await readFile(configPath, 'utf-8');
        const config = JSON.parse(content);

        if (config.name) {
          // Handle scoped packages: @org/package -> { org: "org", name: "package" }
          const nameMatch = config.name.match(/^(?:@([^/]+)\/)?(.+)$/);
          if (nameMatch) {
            return {
              organization: nameMatch[1],
              name: nameMatch[2],
            };
          }
        }
      } catch (_error) {}
    }
  }

  return {};
}

/**
 * Extract organization and repo from filesystem path patterns
 */
function parsePathStructure(projectPath: string): { organization?: string; name: string } {
  const parts = projectPath.split('/');
  const pathName = basename(projectPath);

  // Look for Projects/org/repo pattern
  const projectsIndex = parts.findIndex((part) => part.toLowerCase() === 'projects');
  if (projectsIndex >= 0 && parts.length > projectsIndex + 2) {
    return {
      organization: parts[projectsIndex + 1],
      name: parts[projectsIndex + 2] || pathName,
    };
  }

  // Look for src/github.com/org/repo pattern (Go-style)
  const githubIndex = parts.findIndex((part) => part === 'github.com');
  if (githubIndex >= 0 && parts.length > githubIndex + 2) {
    return {
      organization: parts[githubIndex + 1],
      name: parts[githubIndex + 2] || pathName,
    };
  }

  return { name: pathName };
}

/**
 * Generate unique project ID for Zep user scoping
 */
function generateProjectId(context: Partial<ProjectContext>): string {
  const parts: string[] = [];

  if (context.organization) {
    parts.push(context.organization);
  }

  if (context.projectName) {
    parts.push(context.projectName);
  }

  if (parts.length === 0) {
    parts.push('default');
  }

  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Detect project context from working directory
 */
export async function detectProject(workingDir: string = process.cwd()): Promise<ProjectContext> {
  const resolvedPath = resolve(workingDir);

  // Try git-based detection first - this is now the primary method
  const gitRoot = await findGitRoot(resolvedPath);

  if (gitRoot) {
    const gitRemoteInfo = await getGitRemoteInfo(gitRoot);
    const projectConfig = await parseProjectConfig(gitRoot);
    const pathStructure = parsePathStructure(gitRoot);

    // Priority order for project info:
    // 1. Git remote URL (highest priority - most authoritative)
    // 2. Project config files (package.json, deno.json)
    // 3. Path structure (fallback)

    let projectName: string;
    let organization: string | undefined;

    if (gitRemoteInfo && (gitRemoteInfo.name || gitRemoteInfo.organization)) {
      // Use git remote as primary source
      projectName = gitRemoteInfo.name || projectConfig.name || pathStructure.name;
      organization = gitRemoteInfo.organization || projectConfig.organization || pathStructure.organization;
    } else {
      // Fallback to config/path
      projectName = projectConfig.name || pathStructure.name;
      organization = projectConfig.organization || pathStructure.organization;
    }

    const projectId = generateProjectId({ organization, projectName });
    const groupId = process.env.GROUP_ID || `project-${projectId}`;

    return {
      projectId,
      groupId,
      projectPath: gitRoot,
      projectName,
      gitRemote: gitRemoteInfo?.url,
      projectType: 'git',
      organization,
    };
  }

  // Fallback to directory-based detection
  const projectConfig = await parseProjectConfig(resolvedPath);
  const pathStructure = parsePathStructure(resolvedPath);

  const projectName = projectConfig.name || pathStructure.name;
  const organization = projectConfig.organization || pathStructure.organization;

  const projectId = generateProjectId({ organization, projectName });
  // Allow manual GROUP_ID override via environment variable
  const groupId = process.env.GROUP_ID || `project-${projectId}`;
  return {
    projectId,
    groupId,
    projectPath: resolvedPath,
    projectName,
    projectType: 'directory',
    organization,
  };
}

/**
 * Get scoped user ID for Zep based on project context
 * @deprecated Use simple user ID instead of project-scoped IDs
 * This function is kept for backward compatibility but should not be used in new code
 */
export function getScopedUserId(baseUserId: string, projectContext: ProjectContext): string {
  console.warn('⚠️  getScopedUserId is deprecated. Use simple user ID from getDefaultConfig() instead.');
  return `${baseUserId}-${projectContext.projectId}`;
}

/**
 * Technology Detection System
 * Detects technologies used in a project with confidence scoring
 */

/**
 * Detect technologies from package.json dependencies
 */
async function detectPackageJsonTechnologies(projectPath: string): Promise<TechnologyDetection[]> {
  const packageJsonPath = resolve(projectPath, 'package.json');
  const technologies: TechnologyDetection[] = [];

  if (!existsSync(packageJsonPath)) {
    return technologies;
  }

  try {
    const content = await readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);

    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    };

    // Technology mapping with confidence scores
    const techMap: Record<string, { name: string; confidence: number; version?: string }> = {
      react: { name: 'React', confidence: 0.95 },
      '@types/react': { name: 'React', confidence: 0.9 },
      vue: { name: 'Vue.js', confidence: 0.95 },
      angular: { name: 'Angular', confidence: 0.95 },
      '@angular/core': { name: 'Angular', confidence: 0.95 },
      svelte: { name: 'Svelte', confidence: 0.95 },
      next: { name: 'Next.js', confidence: 0.95 },
      nuxt: { name: 'Nuxt.js', confidence: 0.95 },
      express: { name: 'Express.js', confidence: 0.95 },
      fastify: { name: 'Fastify', confidence: 0.95 },
      koa: { name: 'Koa.js', confidence: 0.95 },
      nestjs: { name: 'NestJS', confidence: 0.95 },
      '@nestjs/core': { name: 'NestJS', confidence: 0.95 },
      typescript: { name: 'TypeScript', confidence: 0.95 },
      '@types/node': { name: 'Node.js', confidence: 0.85 },
      node: { name: 'Node.js', confidence: 0.9 },
      webpack: { name: 'Webpack', confidence: 0.9 },
      vite: { name: 'Vite', confidence: 0.9 },
      rollup: { name: 'Rollup', confidence: 0.9 },
      parcel: { name: 'Parcel', confidence: 0.9 },
      jest: { name: 'Jest', confidence: 0.85 },
      vitest: { name: 'Vitest', confidence: 0.85 },
      cypress: { name: 'Cypress', confidence: 0.85 },
      playwright: { name: 'Playwright', confidence: 0.85 },
      tailwindcss: { name: 'Tailwind CSS', confidence: 0.9 },
      sass: { name: 'Sass', confidence: 0.9 },
      less: { name: 'Less', confidence: 0.9 },
      'styled-components': { name: 'Styled Components', confidence: 0.9 },
      emotion: { name: 'Emotion', confidence: 0.9 },
      prisma: { name: 'Prisma', confidence: 0.95 },
      mongoose: { name: 'MongoDB/Mongoose', confidence: 0.9 },
      sequelize: { name: 'Sequelize', confidence: 0.9 },
      typeorm: { name: 'TypeORM', confidence: 0.9 },
      redis: { name: 'Redis', confidence: 0.9 },
      graphql: { name: 'GraphQL', confidence: 0.9 },
      apollo: { name: 'Apollo GraphQL', confidence: 0.9 },
      'socket.io': { name: 'Socket.IO', confidence: 0.9 },
      electron: { name: 'Electron', confidence: 0.95 },
    };

    for (const [depName, version] of Object.entries(allDeps)) {
      if (techMap[depName]) {
        const tech = techMap[depName];
        technologies.push({
          name: tech.name,
          confidence: tech.confidence,
          source: 'package.json',
          version: typeof version === 'string' ? version : undefined,
          context: `Dependency: ${depName}`,
        });
      }
    }

    // Detect Node.js from engines field
    if (pkg.engines?.node) {
      technologies.push({
        name: 'Node.js',
        confidence: 0.95,
        source: 'package.json',
        version: pkg.engines.node,
        context: 'Engine requirement',
      });
    }

    return technologies;
  } catch (error) {
    console.warn(`Failed to parse package.json: ${error}`);
    return technologies;
  }
}

/**
 * Parse deno config and extract basic technologies
 */
function parseDenoBasicTechnologies(config: any, configFile: string): TechnologyDetection[] {
  const technologies: TechnologyDetection[] = [];

  // Deno itself is present
  technologies.push({
    name: 'Deno',
    confidence: 0.95,
    source: 'deno.json',
    context: `Configuration: ${configFile}`,
  });

  // Check for TypeScript in compilerOptions
  if (config.compilerOptions) {
    technologies.push({
      name: 'TypeScript',
      confidence: 0.9,
      source: 'deno.json',
      context: 'Compiler options present',
    });
  }

  return technologies;
}

/**
 * Extract technologies from deno imports configuration
 */
function parseDenoImportTechnologies(imports: Record<string, any>): TechnologyDetection[] {
  const technologies: TechnologyDetection[] = [];

  const importMap: Record<string, { name: string; confidence: number }> = {
    react: { name: 'React', confidence: 0.9 },
    preact: { name: 'Preact', confidence: 0.9 },
    fresh: { name: 'Fresh', confidence: 0.95 },
    oak: { name: 'Oak', confidence: 0.9 },
    hono: { name: 'Hono', confidence: 0.9 },
    '@std/': { name: 'Deno Standard Library', confidence: 0.85 },
    'std/': { name: 'Deno Standard Library', confidence: 0.85 },
  };

  for (const [importKey, importValue] of Object.entries(imports)) {
    for (const [pattern, tech] of Object.entries(importMap)) {
      if (importKey.includes(pattern) || (typeof importValue === 'string' && importValue.includes(pattern))) {
        technologies.push({
          name: tech.name,
          confidence: tech.confidence,
          source: 'deno.json',
          context: `Import: ${importKey}`,
        });
      }
    }
  }

  return technologies;
}

/**
 * Detect technologies from deno.json/deno.jsonc configuration
 */
async function detectDenoTechnologies(projectPath: string): Promise<TechnologyDetection[]> {
  const technologies: TechnologyDetection[] = [];
  const denoConfigs = ['deno.json', 'deno.jsonc'];

  for (const configFile of denoConfigs) {
    const configPath = resolve(projectPath, configFile);

    if (existsSync(configPath)) {
      try {
        const content = await readFile(configPath, 'utf-8');
        const config = JSON.parse(content);

        // Extract basic technologies
        technologies.push(...parseDenoBasicTechnologies(config, configFile));

        // Extract import-based technologies
        if (config.imports) {
          technologies.push(...parseDenoImportTechnologies(config.imports));
        }

        break; // Found config, no need to check other files
      } catch (error) {
        console.warn(`Failed to parse ${configFile}: ${error}`);
      }
    }
  }

  return technologies;
}

/**
 * Analyze file extensions to detect technologies
 */
async function detectFileExtensionTechnologies(projectPath: string): Promise<TechnologyDetection[]> {
  const technologies: TechnologyDetection[] = [];
  const extensionCounts: Record<string, number> = {};

  try {
    // Walk through project directory
    const walkDir = async (dir: string, depth = 0): Promise<void> => {
      if (depth > 3) {
        return; // Limit recursion depth
      }

      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        const fullPath = resolve(dir, entry.name);

        if (entry.isDirectory()) {
          await walkDir(fullPath, depth + 1);
        } else if (entry.isFile()) {
          const ext = entry.name.split('.').pop()?.toLowerCase();
          if (ext) {
            extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
          }
        }
      }
    };

    await walkDir(projectPath);

    // Technology mapping based on file extensions
    const extMap: Record<string, { name: string; baseConfidence: number }> = {
      ts: { name: 'TypeScript', baseConfidence: 0.85 },
      tsx: { name: 'TypeScript', baseConfidence: 0.9 },
      jsx: { name: 'React', baseConfidence: 0.8 },
      vue: { name: 'Vue.js', baseConfidence: 0.95 },
      svelte: { name: 'Svelte', baseConfidence: 0.95 },
      py: { name: 'Python', baseConfidence: 0.9 },
      java: { name: 'Java', baseConfidence: 0.9 },
      kt: { name: 'Kotlin', baseConfidence: 0.9 },
      rs: { name: 'Rust', baseConfidence: 0.9 },
      go: { name: 'Go', baseConfidence: 0.9 },
      rb: { name: 'Ruby', baseConfidence: 0.9 },
      php: { name: 'PHP', baseConfidence: 0.9 },
      cs: { name: 'C#', baseConfidence: 0.9 },
      cpp: { name: 'C++', baseConfidence: 0.9 },
      c: { name: 'C', baseConfidence: 0.9 },
      swift: { name: 'Swift', baseConfidence: 0.9 },
      scss: { name: 'Sass', baseConfidence: 0.8 },
      sass: { name: 'Sass', baseConfidence: 0.8 },
      less: { name: 'Less', baseConfidence: 0.8 },
      styl: { name: 'Stylus', baseConfidence: 0.8 },
    };

    const totalFiles = Object.values(extensionCounts).reduce((sum, count) => sum + count, 0);

    for (const [ext, count] of Object.entries(extensionCounts)) {
      if (extMap[ext] && count > 0) {
        const tech = extMap[ext];
        const prevalence = count / totalFiles;
        const confidence = Math.min(tech.baseConfidence + prevalence * 0.2, 0.95);

        technologies.push({
          name: tech.name,
          confidence: confidence,
          source: 'file_extensions',
          context: `${count} .${ext} files (${(prevalence * 100).toFixed(1)}%)`,
        });
      }
    }
  } catch (error) {
    console.warn(`Failed to analyze file extensions: ${error}`);
  }

  return technologies;
}

/**
 * Detect frameworks based on configuration files and patterns
 */
function detectFrameworkTechnologies(projectPath: string): Promise<TechnologyDetection[]> {
  const technologies: TechnologyDetection[] = [];

  const frameworkConfigs: Record<string, { name: string; confidence: number; files: string[] }> = {
    'next.config.js': {
      name: 'Next.js',
      confidence: 0.95,
      files: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
    },
    'nuxt.config.js': { name: 'Nuxt.js', confidence: 0.95, files: ['nuxt.config.js', 'nuxt.config.ts'] },
    'vue.config.js': { name: 'Vue.js', confidence: 0.9, files: ['vue.config.js'] },
    'angular.json': { name: 'Angular', confidence: 0.95, files: ['angular.json'] },
    'svelte.config.js': { name: 'Svelte', confidence: 0.95, files: ['svelte.config.js'] },
    'gatsby-config.js': { name: 'Gatsby', confidence: 0.95, files: ['gatsby-config.js'] },
    'remix.config.js': { name: 'Remix', confidence: 0.95, files: ['remix.config.js'] },
    'astro.config.js': { name: 'Astro', confidence: 0.95, files: ['astro.config.mjs', 'astro.config.js'] },
    'vite.config.js': { name: 'Vite', confidence: 0.9, files: ['vite.config.js', 'vite.config.ts'] },
    'webpack.config.js': { name: 'Webpack', confidence: 0.85, files: ['webpack.config.js'] },
    'rollup.config.js': { name: 'Rollup', confidence: 0.85, files: ['rollup.config.js'] },
    'fresh.gen.ts': { name: 'Fresh', confidence: 0.95, files: ['fresh.gen.ts'] },
    'tsconfig.json': { name: 'TypeScript', confidence: 0.85, files: ['tsconfig.json'] },
    'tailwind.config.js': {
      name: 'Tailwind CSS',
      confidence: 0.9,
      files: ['tailwind.config.js', 'tailwind.config.ts'],
    },
    'postcss.config.js': { name: 'PostCSS', confidence: 0.8, files: ['postcss.config.js'] },
  };

  for (const [_configKey, config] of Object.entries(frameworkConfigs)) {
    for (const fileName of config.files) {
      const configPath = resolve(projectPath, fileName);
      if (existsSync(configPath)) {
        technologies.push({
          name: config.name,
          confidence: config.confidence,
          source: 'framework',
          context: `Configuration: ${fileName}`,
        });
        break; // Found one config file for this framework
      }
    }
  }

  return Promise.resolve(technologies);
}

/**
 * Detect database technologies
 */
async function detectDatabaseTechnologies(projectPath: string): Promise<TechnologyDetection[]> {
  const technologies: TechnologyDetection[] = [];

  // Check for database config files
  const dbConfigs: Record<string, { name: string; confidence: number }> = {
    'prisma/schema.prisma': { name: 'Prisma', confidence: 0.95 },
    'drizzle.config.js': { name: 'Drizzle ORM', confidence: 0.95 },
    'drizzle.config.ts': { name: 'Drizzle ORM', confidence: 0.95 },
    'sequelize.config.js': { name: 'Sequelize', confidence: 0.9 },
    'knexfile.js': { name: 'Knex.js', confidence: 0.9 },
    'ormconfig.json': { name: 'TypeORM', confidence: 0.9 },
    'mikro-orm.config.js': { name: 'MikroORM', confidence: 0.9 },
  };

  for (const [configPath, config] of Object.entries(dbConfigs)) {
    const fullPath = resolve(projectPath, configPath);
    if (existsSync(fullPath)) {
      technologies.push({
        name: config.name,
        confidence: config.confidence,
        source: 'database',
        context: `Configuration: ${configPath}`,
      });
    }
  }

  // Check for database connection files or env patterns
  const envFile = resolve(projectPath, '.env');
  if (existsSync(envFile)) {
    try {
      const envContent = await readFile(envFile, 'utf-8');

      const dbPatterns: Record<string, { name: string; confidence: number }> = {
        'DATABASE_URL.*postgresql': { name: 'PostgreSQL', confidence: 0.85 },
        'DATABASE_URL.*mysql': { name: 'MySQL', confidence: 0.85 },
        'DATABASE_URL.*mongodb': { name: 'MongoDB', confidence: 0.85 },
        'DATABASE_URL.*sqlite': { name: 'SQLite', confidence: 0.85 },
        REDIS_URL: { name: 'Redis', confidence: 0.8 },
        MONGO_URI: { name: 'MongoDB', confidence: 0.8 },
        POSTGRES_: { name: 'PostgreSQL', confidence: 0.75 },
        MYSQL_: { name: 'MySQL', confidence: 0.75 },
      };

      for (const [pattern, config] of Object.entries(dbPatterns)) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(envContent)) {
          technologies.push({
            name: config.name,
            confidence: config.confidence,
            source: 'database',
            context: 'Environment variable',
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to read .env file: ${error}`);
    }
  }

  return technologies;
}

/**
 * Detect containerization technologies
 */
function detectContainerTechnologies(projectPath: string): Promise<TechnologyDetection[]> {
  const technologies: TechnologyDetection[] = [];

  const containerConfigs: Record<string, { name: string; confidence: number }> = {
    Dockerfile: { name: 'Docker', confidence: 0.95 },
    'docker-compose.yml': { name: 'Docker Compose', confidence: 0.9 },
    'docker-compose.yaml': { name: 'Docker Compose', confidence: 0.9 },
    '.dockerignore': { name: 'Docker', confidence: 0.8 },
    'kubernetes.yml': { name: 'Kubernetes', confidence: 0.85 },
    'k8s.yml': { name: 'Kubernetes', confidence: 0.85 },
    'helm/': { name: 'Helm', confidence: 0.85 },
    'skaffold.yaml': { name: 'Skaffold', confidence: 0.85 },
    '.devcontainer/': { name: 'Dev Containers', confidence: 0.8 },
  };

  for (const [configPath, config] of Object.entries(containerConfigs)) {
    const fullPath = resolve(projectPath, configPath);
    const isDir = configPath.endsWith('/');

    if ((isDir && existsSync(fullPath)) || (!isDir && existsSync(fullPath))) {
      technologies.push({
        name: config.name,
        confidence: config.confidence,
        source: 'docker',
        context: `Configuration: ${configPath}`,
      });
    }
  }

  return Promise.resolve(technologies);
}

/**
 * Calculate confidence scores and combine detections
 */
function calculateTechnologyConfidence(detections: TechnologyDetection[]): TechnologyDetection[] {
  const technologyMap = new Map<string, TechnologyDetection[]>();

  // Group detections by technology name
  for (const detection of detections) {
    const key = detection.name;
    if (!technologyMap.has(key)) {
      technologyMap.set(key, []);
    }
    technologyMap.get(key)?.push(detection);
  }

  const result: TechnologyDetection[] = [];

  // Combine and calculate final confidence for each technology
  for (const [techName, techDetections] of technologyMap) {
    // Take the highest confidence and combine contexts
    const maxConfidence = Math.max(...techDetections.map((d) => d.confidence));
    const sources = [...new Set(techDetections.map((d) => d.source))];
    const contexts = techDetections.map((d) => d.context).filter(Boolean);
    const versions = techDetections.map((d) => d.version).filter(Boolean);

    // Bonus for multiple detection sources
    const sourceBonus = sources.length > 1 ? 0.05 : 0;
    const finalConfidence = Math.min(maxConfidence + sourceBonus, 0.95);

    result.push({
      name: techName,
      confidence: finalConfidence,
      source: sources[0] || 'unknown', // Primary source
      version: versions[0], // Primary version
      context: contexts.join('; '),
    });
  }

  return result.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Main technology detection function
 */
export async function detectProjectTechnologies(
  projectPath: string,
  confidenceThreshold = 0.6,
): Promise<TechnologyDetectionResult> {
  const allDetections: TechnologyDetection[] = [];

  try {
    // Run all detection methods
    const [packageTech, denoTech, fileTech, frameworkTech, dbTech, containerTech] = await Promise.all([
      detectPackageJsonTechnologies(projectPath),
      detectDenoTechnologies(projectPath),
      detectFileExtensionTechnologies(projectPath),
      detectFrameworkTechnologies(projectPath),
      detectDatabaseTechnologies(projectPath),
      detectContainerTechnologies(projectPath),
    ]);

    allDetections.push(...packageTech, ...denoTech, ...fileTech, ...frameworkTech, ...dbTech, ...containerTech);

    // Calculate final confidence scores
    const technologies = calculateTechnologyConfidence(allDetections).filter(
      (tech) => tech.confidence >= confidenceThreshold,
    );

    const overallConfidence =
      technologies.length > 0 ? technologies.reduce((sum, tech) => sum + tech.confidence, 0) / technologies.length : 0;

    return {
      technologies,
      overallConfidence,
      detectedAt: new Date().toISOString(),
      projectPath,
    };
  } catch (error) {
    console.error(`Technology detection failed for ${projectPath}:`, error);
    return {
      technologies: [],
      overallConfidence: 0,
      detectedAt: new Date().toISOString(),
      projectPath,
    };
  }
}
