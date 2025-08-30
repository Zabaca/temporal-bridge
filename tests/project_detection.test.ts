/**
 * Unit Tests for Project Detection Path Logic
 * Tests the core path parsing and project ID generation without external dependencies
 */

import { assertEquals, assert } from "https://deno.land/std@0.220.1/assert/mod.ts";

/**
 * Extract testable functions from project-detector.ts for unit testing
 * These are copies of the internal functions to test business logic
 */

function parsePathStructure(projectPath: string): { organization?: string; name: string } {
  const parts = projectPath.split('/');
  const pathName = parts[parts.length - 1]; // basename equivalent
  
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

function generateProjectId(context: { organization?: string; projectName?: string }): string {
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

function parseProjectConfig(configName: string): { name?: string; organization?: string } {
  // Handle scoped packages: @org/package -> { org: "org", name: "package" }
  const nameMatch = configName.match(/^(?:@([^/]+)\/)?(.+)$/);
  if (nameMatch) {
    return {
      organization: nameMatch[1],
      name: nameMatch[2]
    };
  }
  return {};
}

/**
 * Test Data - Various project path patterns
 */
const testCases = [
  // Standard patterns that should work well
  {
    path: "/home/user/Projects/acme/my-project",
    expected: { organization: "acme", name: "my-project" },
    description: "Standard Projects/org/repo pattern"
  },
  {
    path: "/home/user/projects/acme/my-project",
    expected: { organization: "acme", name: "my-project" },
    description: "Lowercase 'projects' folder"
  },
  {
    path: "/src/github.com/acme/my-project",
    expected: { organization: "acme", name: "my-project" },
    description: "Go-style github.com pattern"
  },
  
  // Patterns without organization
  {
    path: "/home/user/my-project",
    expected: { organization: undefined, name: "my-project" },
    description: "Simple project without organization"
  },
  {
    path: "/home/user/Projects/my-project",
    expected: { organization: undefined, name: "my-project" },
    description: "Projects folder without organization"
  },
  
  // Edge cases and potential issues
  {
    path: "/home/user/Projects/personal/blog/website",
    expected: { organization: "personal", name: "blog" },
    description: "Deep nesting - takes middle folder as project name"
  },
  {
    path: "/home/user/MyProjects/company/app",
    expected: { organization: undefined, name: "app" },
    description: "Non-standard 'MyProjects' folder name"
  },
  {
    path: "/opt/apps/service",
    expected: { organization: undefined, name: "service" },
    description: "System path without Projects"
  },
  {
    path: "/home/user/Desktop/test",
    expected: { organization: undefined, name: "test" },
    description: "Desktop project"
  },
  
  // Special characters and edge cases
  {
    path: "/home/user/Projects/my-org/my-project-v2",
    expected: { organization: "my-org", name: "my-project-v2" },
    description: "Hyphenated names"
  },
  {
    path: "/home/user/Projects/org.com/project.name",
    expected: { organization: "org.com", name: "project.name" },
    description: "Names with dots"
  },
  {
    path: "/Users/developer/Projects/Company Inc/My App",
    expected: { organization: "Company Inc", name: "My App" },
    description: "Names with spaces"
  }
];

/**
 * Test Path Structure Parsing
 */
Deno.test("Project Detection - Path Structure Parsing", async (t) => {
  for (const testCase of testCases) {
    await t.step(testCase.description, () => {
      const result = parsePathStructure(testCase.path);
      
      assertEquals(
        result.organization, 
        testCase.expected.organization, 
        `Organization mismatch for path: ${testCase.path}`
      );
      assertEquals(
        result.name, 
        testCase.expected.name, 
        `Project name mismatch for path: ${testCase.path}`
      );
    });
  }
});

/**
 * Test Project ID Generation
 */
Deno.test("Project Detection - Project ID Generation", async (t) => {
  await t.step("should generate ID with organization and project", () => {
    const result = generateProjectId({ 
      organization: "acme", 
      projectName: "my-project" 
    });
    assertEquals(result, "acme-my-project");
  });

  await t.step("should generate ID with project name only", () => {
    const result = generateProjectId({ projectName: "my-project" });
    assertEquals(result, "my-project");
  });

  await t.step("should generate default ID when empty", () => {
    const result = generateProjectId({});
    assertEquals(result, "default");
  });

  await t.step("should handle special characters", () => {
    const result = generateProjectId({ 
      organization: "Company Inc.", 
      projectName: "My App!" 
    });
    assertEquals(result, "company-inc-my-app");
  });

  await t.step("should handle multiple consecutive hyphens", () => {
    const result = generateProjectId({ 
      organization: "org--name", 
      projectName: "project__name" 
    });
    assertEquals(result, "org-name-project-name");
  });

  await t.step("should trim leading/trailing hyphens", () => {
    const result = generateProjectId({ 
      organization: "-org-", 
      projectName: "-project-" 
    });
    assertEquals(result, "org-project");
  });

  await t.step("should convert to lowercase", () => {
    const result = generateProjectId({ 
      organization: "ACME", 
      projectName: "MyProject" 
    });
    assertEquals(result, "acme-myproject");
  });
});

/**
 * Test Scoped Package Name Parsing
 */
Deno.test("Project Detection - Scoped Package Parsing", async (t) => {
  await t.step("should parse scoped package names", () => {
    const result = parseProjectConfig("@acme/my-package");
    assertEquals(result.organization, "acme");
    assertEquals(result.name, "my-package");
  });

  await t.step("should parse regular package names", () => {
    const result = parseProjectConfig("my-package");
    assertEquals(result.organization, undefined);
    assertEquals(result.name, "my-package");
  });

  await t.step("should handle complex scoped names", () => {
    const result = parseProjectConfig("@my-org/my-complex-package-name");
    assertEquals(result.organization, "my-org");
    assertEquals(result.name, "my-complex-package-name");
  });
});

/**
 * Integration Test - Full Project Context Generation
 */
Deno.test("Project Detection - Integration Scenarios", async (t) => {
  await t.step("should prioritize config over path structure", () => {
    // Simulate config having different name than path
    const pathResult = parsePathStructure("/home/user/Projects/acme/my-project");
    const configResult = parseProjectConfig("@different-org/different-name");
    
    // Final logic prefers config
    const finalName = configResult.name || pathResult.name;
    const finalOrg = configResult.organization || pathResult.organization;
    
    assertEquals(finalName, "different-name");
    assertEquals(finalOrg, "different-org");
  });

  await t.step("should fallback to path when no config", () => {
    const pathResult = parsePathStructure("/home/user/Projects/acme/my-project");
    const configResult = parseProjectConfig(""); // Empty config
    
    const finalName = configResult.name || pathResult.name;
    const finalOrg = configResult.organization || pathResult.organization;
    
    assertEquals(finalName, "my-project");
    assertEquals(finalOrg, "acme");
  });

  await t.step("should handle projects with no organization gracefully", () => {
    const pathResult = parsePathStructure("/home/user/standalone-project");
    const projectId = generateProjectId({ 
      organization: pathResult.organization, 
      projectName: pathResult.name 
    });
    
    assertEquals(pathResult.organization, undefined);
    assertEquals(pathResult.name, "standalone-project");
    assertEquals(projectId, "standalone-project");
  });
});

/**
 * Edge Case Tests - Document Current Behavior
 */
Deno.test("Project Detection - Edge Cases Documentation", async (t) => {
  await t.step("deep nesting behavior - documents current limitation", () => {
    // This documents the current behavior where deep nesting 
    // takes the middle folder, not the deepest one
    const result = parsePathStructure("/home/user/Projects/personal/blog/website/admin");
    
    // Current behavior: takes "blog" as project name, not "admin" or "website"
    assertEquals(result.organization, "personal");
    assertEquals(result.name, "blog");
    
    // This test documents that this might not be the desired behavior
    // but shows how the current logic works
  });

  await t.step("config prioritization in deep nesting scenario", () => {
    // Simulate the real scenario: deep nested path with package.json
    const pathResult = parsePathStructure("/home/user/Projects/personal/blog/website");
    const configResult = parseProjectConfig("my-website-project");
    
    // Path parsing gives wrong result
    assertEquals(pathResult.organization, "personal");
    assertEquals(pathResult.name, "blog"); // Wrong! Should be "website"
    
    // But config overrides and fixes it
    const finalName = configResult.name || pathResult.name;
    const finalOrg = configResult.organization || pathResult.organization;
    
    assertEquals(finalName, "my-website-project"); // Config wins!
    assertEquals(finalOrg, "personal"); // From path structure
  });

  await t.step("case sensitivity for Projects folder", () => {
    const lowercase = parsePathStructure("/home/user/projects/acme/app");
    const uppercase = parsePathStructure("/home/user/PROJECTS/acme/app");
    const mixed = parsePathStructure("/home/user/Projects/acme/app");
    
    // All variations should work because we use toLowerCase() in the search
    assertEquals(lowercase.organization, "acme");
    assertEquals(mixed.organization, "acme");
    assertEquals(uppercase.organization, "acme"); // Actually works due to toLowerCase()
  });

  await t.step("empty or undefined inputs", () => {
    const emptyPath = parsePathStructure("");
    const slashOnly = parsePathStructure("/");
    
    // Should not crash, should return reasonable defaults
    assertEquals(emptyPath.name, "");
    assertEquals(slashOnly.name, "");
    assert(emptyPath.organization === undefined);
    assert(slashOnly.organization === undefined);
  });
});