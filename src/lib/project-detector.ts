#!/usr/bin/env -S deno run --allow-read --allow-run

/**
 * Project Context Detection for TemporalBridge
 * Automatically detects project context for memory isolation
 */

import { existsSync } from "https://deno.land/std@0.220.1/fs/mod.ts";
import { dirname, basename, resolve } from "https://deno.land/std@0.220.1/path/mod.ts";

export interface ProjectContext {
  /** Unique project identifier for Zep user scoping */
  projectId: string;
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
 * Extract git remote URL
 */
async function getGitRemote(gitRoot: string): Promise<string | null> {
  try {
    const command = new Deno.Command('git', {
      args: ['remote', 'get-url', 'origin'],
      cwd: gitRoot,
      stdout: 'piped',
      stderr: 'piped'
    });
    
    const { success, stdout } = await command.output();
    
    if (success) {
      const remote = new TextDecoder().decode(stdout).trim();
      return remote || null;
    }
  } catch (error) {
    // Git not available or no remote
  }
  
  return null;
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
        const content = await Deno.readTextFile(configPath);
        const config = JSON.parse(content);
        
        if (config.name) {
          // Handle scoped packages: @org/package -> { org: "org", name: "package" }
          const nameMatch = config.name.match(/^(?:@([^/]+)\/)?(.+)$/);
          if (nameMatch) {
            return {
              organization: nameMatch[1],
              name: nameMatch[2]
            };
          }
        }
      } catch (error) {
        // Skip malformed config files
        continue;
      }
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
  const projectsIndex = parts.findIndex(part => part.toLowerCase() === 'projects');
  if (projectsIndex >= 0 && parts.length > projectsIndex + 2) {
    return {
      organization: parts[projectsIndex + 1],
      name: parts[projectsIndex + 2] || pathName
    };
  }
  
  // Look for src/github.com/org/repo pattern (Go-style)
  const githubIndex = parts.findIndex(part => part === 'github.com');
  if (githubIndex >= 0 && parts.length > githubIndex + 2) {
    return {
      organization: parts[githubIndex + 1],
      name: parts[githubIndex + 2] || pathName
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
  
  return parts.join('-').toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Detect project context from working directory
 */
export async function detectProject(workingDir: string = Deno.cwd()): Promise<ProjectContext> {
  const resolvedPath = resolve(workingDir);
  
  // Try git-based detection first
  const gitRoot = await findGitRoot(resolvedPath);
  
  if (gitRoot) {
    const gitRemote = await getGitRemote(gitRoot);
    const projectConfig = await parseProjectConfig(gitRoot);
    const pathStructure = parsePathStructure(gitRoot);
    
    // Prefer config name, fallback to path structure
    const projectName = projectConfig.name || pathStructure.name;
    const organization = projectConfig.organization || pathStructure.organization;
    
    const context: ProjectContext = {
      projectId: generateProjectId({ organization, projectName }),
      projectPath: gitRoot,
      projectName,
      gitRemote: gitRemote || undefined,
      projectType: 'git',
      organization
    };
    
    return context;
  }
  
  // Fallback to directory-based detection
  const projectConfig = await parseProjectConfig(resolvedPath);
  const pathStructure = parsePathStructure(resolvedPath);
  
  const projectName = projectConfig.name || pathStructure.name;
  const organization = projectConfig.organization || pathStructure.organization;
  
  return {
    projectId: generateProjectId({ organization, projectName }),
    projectPath: resolvedPath,
    projectName,
    projectType: 'directory',
    organization
  };
}

/**
 * Get scoped user ID for Zep based on project context
 */
export function getScopedUserId(baseUserId: string, projectContext: ProjectContext): string {
  return `${baseUserId}-${projectContext.projectId}`;
}

/**
 * CLI interface for project detection
 */
if (import.meta.main) {
  const workingDir = Deno.args[0] || Deno.cwd();
  const context = await detectProject(workingDir);
  
  console.log(JSON.stringify(context, null, 2));
}