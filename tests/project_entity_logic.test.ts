/**
 * Unit Tests for Project Entity Business Logic
 * Tests entity creation, relationship logic, and data transformations
 */

import { assertEquals, assertArrayIncludes, assert } from "https://deno.land/std@0.220.1/assert/mod.ts";
import type { 
  ProjectEntity, 
  ProjectEntityProperties, 
  ProjectRelationship,
  ProjectRelationshipType,
  TechnologyDetection
} from "../src/lib/types.ts";

/**
 * Business Logic Tests - Project Entity Management
 */

Deno.test("Project Entity Creation - Business Logic", async (t) => {
  await t.step("should create valid project entity with all required properties", () => {
    const projectContext = {
      projectId: "test-project",
      projectName: "Test Project",
      organization: "TestOrg",
      projectPath: "/test/path",
      projectType: "git" as const,
      gitRemote: "https://github.com/test/repo.git"
    };

    const technologies: TechnologyDetection[] = [
      { name: "TypeScript", confidence: 0.95, source: "package.json", context: "Dependency" },
      { name: "React", confidence: 0.90, source: "package.json", context: "Dependency" }
    ];

    const entity = createProjectEntity(projectContext, technologies);

    assertEquals(entity.type, "Project");
    assertEquals(entity.name, "test-project");
    assertEquals(entity.properties.displayName, "Test Project");
    assertEquals(entity.properties.organization, "TestOrg");
    assertEquals(entity.properties.repository, "https://github.com/test/repo.git");
    assertEquals(entity.properties.projectType, "git");
    assertArrayIncludes(entity.properties.technologies, ["TypeScript", "React"]);
    assertEquals(entity.properties.confidence["TypeScript"], 0.95);
    assertEquals(entity.properties.confidence["React"], 0.90);
  });

  await t.step("should handle project without organization", () => {
    const projectContext = {
      projectId: "solo-project",
      projectName: "Solo Project",
      projectPath: "/solo/path",
      projectType: "directory" as const
    };

    const entity = createProjectEntity(projectContext, []);

    assertEquals(entity.properties.organization, undefined);
    assertEquals(entity.properties.repository, undefined);
    assertEquals(entity.properties.technologies.length, 0);
  });

  await t.step("should generate valid timestamps", () => {
    const projectContext = {
      projectId: "time-project",
      projectName: "Time Project",
      projectPath: "/time/path",
      projectType: "git" as const
    };

    const entity = createProjectEntity(projectContext, []);

    assert(entity.properties.created, "Should have created timestamp");
    assert(entity.properties.lastUpdated, "Should have lastUpdated timestamp");
    
    // Should be valid ISO strings
    assert(!isNaN(Date.parse(entity.properties.created)), "Created should be valid date");
    assert(!isNaN(Date.parse(entity.properties.lastUpdated)), "LastUpdated should be valid date");
  });
});

Deno.test("Project Relationships - Business Logic", async (t) => {
  await t.step("should create developer WORKS_ON project relationship", () => {
    const relationship = createDeveloperRelationship("developer", "test-project");

    assertEquals(relationship.subject, "developer");
    assertEquals(relationship.predicate, "WORKS_ON");
    assertEquals(relationship.object, "test-project");
    assertEquals(relationship.confidence, 1.0);
    assertEquals(relationship.context, "Project developer relationship");
  });

  await t.step("should create project USES technology relationships", () => {
    const technologies: TechnologyDetection[] = [
      { name: "TypeScript", confidence: 0.95, source: "package.json", context: "Dependency" },
      { name: "React", confidence: 0.80, source: "file_extensions", context: "10 .jsx files" }
    ];

    const relationships = createTechnologyRelationships("test-project", technologies);

    assertEquals(relationships.length, 2);
    
    const tsRelation = relationships.find(r => r.object === "TypeScript");
    assertEquals(tsRelation?.subject, "test-project");
    assertEquals(tsRelation?.predicate, "USES");
    assertEquals(tsRelation?.confidence, 0.95);
    assertEquals(tsRelation?.context, "Dependency");

    const reactRelation = relationships.find(r => r.object === "React");
    assertEquals(reactRelation?.confidence, 0.80);
    assertEquals(reactRelation?.context, "10 .jsx files");
  });

  await t.step("should create project BELONGS_TO organization relationship", () => {
    const relationship = createOrganizationRelationship("test-project", "TestOrg");

    assertEquals(relationship.subject, "test-project");
    assertEquals(relationship.predicate, "BELONGS_TO");
    assertEquals(relationship.object, "TestOrg");
    assertEquals(relationship.confidence, 0.95);
    assertEquals(relationship.context, "Organization ownership");
  });

  await t.step("should create session OCCURS_IN project relationship", () => {
    const relationship = createSessionRelationship("session123", "test-project");

    assertEquals(relationship.subject, "session-session123");
    assertEquals(relationship.predicate, "OCCURS_IN");
    assertEquals(relationship.object, "test-project");
    assertEquals(relationship.confidence, 1.0);
    assertEquals(relationship.context, "Conversation session");
  });

  await t.step("should filter relationships by confidence threshold", () => {
    const technologies: TechnologyDetection[] = [
      { name: "TypeScript", confidence: 0.95, source: "package.json", context: "High confidence" },
      { name: "Unknown", confidence: 0.3, source: "file_extensions", context: "Low confidence" },
      { name: "React", confidence: 0.8, source: "framework", context: "Good confidence" }
    ];

    const relationships = createTechnologyRelationships("test-project", technologies, 0.6);

    assertEquals(relationships.length, 2, "Should filter out low confidence relationships");
    const techNames = relationships.map(r => r.object);
    assertArrayIncludes(techNames, ["TypeScript", "React"]);
    assert(!techNames.includes("Unknown"), "Should not include low confidence technology");
  });
});

Deno.test("Entity Update Logic - Business Logic", async (t) => {
  await t.step("should detect when entity needs updating", () => {
    const existing = {
      technologies: ["TypeScript", "React"],
      lastUpdated: "2024-01-01T00:00:00.000Z"
    };

    const newTechnologies = ["TypeScript", "React", "Next.js"];
    
    const needsUpdate = shouldUpdateEntity(existing, newTechnologies);
    assertEquals(needsUpdate, true, "Should need update when technologies change");
  });

  await t.step("should detect when no update needed", () => {
    const existing = {
      technologies: ["TypeScript", "React"],
      lastUpdated: "2024-01-01T00:00:00.000Z"
    };

    const sameTechnologies = ["React", "TypeScript"]; // Different order but same content
    
    const needsUpdate = shouldUpdateEntity(existing, sameTechnologies);
    assertEquals(needsUpdate, false, "Should not need update when technologies are the same");
  });

  await t.step("should handle empty technology arrays", () => {
    const existing = { technologies: [], lastUpdated: "2024-01-01T00:00:00.000Z" };
    const newTechnologies: string[] = [];
    
    const needsUpdate = shouldUpdateEntity(existing, newTechnologies);
    assertEquals(needsUpdate, false, "Should not need update when both are empty");
  });

  await t.step("should update entity properties correctly", () => {
    const existingEntity: ProjectEntity = {
      type: "Project",
      name: "test-project",
      properties: {
        displayName: "Test Project",
        projectType: "git",
        technologies: ["TypeScript"],
        path: "/test/path",
        created: "2024-01-01T00:00:00.000Z",
        lastUpdated: "2024-01-01T00:00:00.000Z",
        confidence: { "TypeScript": 0.9 }
      }
    };

    const newTechnologies: TechnologyDetection[] = [
      { name: "TypeScript", confidence: 0.95, source: "package.json", context: "Updated" },
      { name: "React", confidence: 0.90, source: "package.json", context: "New" }
    ];

    const updatedEntity = updateEntityProperties(existingEntity, newTechnologies);

    assertEquals(updatedEntity.properties.technologies, ["TypeScript", "React"]);
    assertEquals(updatedEntity.properties.confidence["TypeScript"], 0.95);
    assertEquals(updatedEntity.properties.confidence["React"], 0.90);
    assert(updatedEntity.properties.lastUpdated > existingEntity.properties.lastUpdated);
    assertEquals(updatedEntity.properties.created, existingEntity.properties.created, "Created timestamp should not change");
  });
});

Deno.test("Relationship Parsing - Business Logic", async (t) => {
  await t.step("should parse WORKS_ON relationships correctly", () => {
    const facts = [
      "developer WORKS_ON project-test",
      "alice WORKS_ON project-frontend", 
      "bob WORKS_ON project-backend"
    ];

    const relationships = parseWorksOnRelationships(facts);

    assertEquals(relationships.length, 3);
    assert(relationships[0], "First relationship should exist");
    assertEquals(relationships[0].developer, "developer");
    assertEquals(relationships[0].project, "project-test");
    assert(relationships[1], "Second relationship should exist");
    assertEquals(relationships[1].developer, "alice");
    assertEquals(relationships[1].project, "project-frontend");
  });

  await t.step("should parse USES relationships correctly", () => {
    const facts = [
      "project-test USES TypeScript",
      "project-frontend USES React",
      "project-backend USES Node.js"
    ];

    const relationships = parseUsesRelationships(facts);

    assertEquals(relationships.length, 3);
    assert(relationships[0], "First relationship should exist");
    assertEquals(relationships[0].project, "project-test");
    assertEquals(relationships[0].technology, "TypeScript");
    assert(relationships[1], "Second relationship should exist");
    assertEquals(relationships[1].project, "project-frontend");
    assertEquals(relationships[1].technology, "React");
  });

  await t.step("should parse OCCURS_IN relationships correctly", () => {
    const facts = [
      "session-abc123 OCCURS_IN project-test",
      "session-def456 OCCURS_IN project-frontend"
    ];

    const relationships = parseOccursInRelationships(facts);

    assertEquals(relationships.length, 2);
    assert(relationships[0], "First relationship should exist");
    assertEquals(relationships[0].session, "abc123");
    assertEquals(relationships[0].project, "project-test");
    assert(relationships[1], "Second relationship should exist");
    assertEquals(relationships[1].session, "def456");
    assertEquals(relationships[1].project, "project-frontend");
  });

  await t.step("should handle malformed relationships gracefully", () => {
    const malformedFacts = [
      "invalid fact format",
      "project USES", // missing technology
      "WORKS_ON project", // missing developer
      "session OCCURS_IN" // missing project
    ];

    const worksOn = parseWorksOnRelationships(malformedFacts);
    const uses = parseUsesRelationships(malformedFacts);
    const occursIn = parseOccursInRelationships(malformedFacts);

    assertEquals(worksOn.length, 0, "Should handle malformed WORKS_ON facts");
    assertEquals(uses.length, 0, "Should handle malformed USES facts");
    assertEquals(occursIn.length, 0, "Should handle malformed OCCURS_IN facts");
  });
});

/**
 * Helper functions for business logic testing
 */

function createProjectEntity(
  projectContext: any,
  technologies: TechnologyDetection[]
): ProjectEntity {
  const now = new Date().toISOString();
  
  const properties: ProjectEntityProperties = {
    displayName: projectContext.projectName,
    organization: projectContext.organization,
    repository: projectContext.gitRemote,
    projectType: projectContext.projectType,
    technologies: technologies.map(t => t.name),
    path: projectContext.projectPath,
    created: now,
    lastUpdated: now,
    confidence: technologies.reduce((acc, tech) => {
      acc[tech.name] = tech.confidence;
      return acc;
    }, {} as Record<string, number>)
  };

  return {
    type: "Project",
    name: projectContext.projectId,
    properties
  };
}

function createDeveloperRelationship(developer: string, project: string): ProjectRelationship {
  return {
    subject: developer,
    predicate: "WORKS_ON",
    object: project,
    confidence: 1.0,
    context: "Project developer relationship"
  };
}

function createTechnologyRelationships(
  project: string, 
  technologies: TechnologyDetection[],
  confidenceThreshold = 0.0
): ProjectRelationship[] {
  return technologies
    .filter(tech => tech.confidence >= confidenceThreshold)
    .map(tech => ({
      subject: project,
      predicate: "USES" as ProjectRelationshipType,
      object: tech.name,
      confidence: tech.confidence,
      context: tech.context || `Detected via ${tech.source}`
    }));
}

function createOrganizationRelationship(project: string, organization: string): ProjectRelationship {
  return {
    subject: project,
    predicate: "BELONGS_TO",
    object: organization,
    confidence: 0.95,
    context: "Organization ownership"
  };
}

function createSessionRelationship(session: string, project: string): ProjectRelationship {
  return {
    subject: `session-${session}`,
    predicate: "OCCURS_IN",
    object: project,
    confidence: 1.0,
    context: "Conversation session"
  };
}

function shouldUpdateEntity(
  existing: { technologies: string[]; lastUpdated: string },
  newTechnologies: string[]
): boolean {
  const existingSet = new Set(existing.technologies);
  const newSet = new Set(newTechnologies);
  
  if (existingSet.size !== newSet.size) return true;
  
  for (const tech of newTechnologies) {
    if (!existingSet.has(tech)) return true;
  }
  
  return false;
}

function updateEntityProperties(
  entity: ProjectEntity,
  newTechnologies: TechnologyDetection[]
): ProjectEntity {
  const now = new Date().toISOString();
  
  return {
    ...entity,
    properties: {
      ...entity.properties,
      technologies: newTechnologies.map(t => t.name),
      confidence: newTechnologies.reduce((acc, tech) => {
        acc[tech.name] = tech.confidence;
        return acc;
      }, {} as Record<string, number>),
      lastUpdated: now
    }
  };
}

function parseWorksOnRelationships(facts: string[]): Array<{ developer: string; project: string }> {
  const relationships = [];
  
  for (const fact of facts) {
    const match = fact.match(/^(.+)\s+WORKS_ON\s+(.+)$/);
    if (match && match[1] && match[2]) {
      relationships.push({
        developer: match[1],
        project: match[2]
      });
    }
  }
  
  return relationships;
}

function parseUsesRelationships(facts: string[]): Array<{ project: string; technology: string }> {
  const relationships = [];
  
  for (const fact of facts) {
    const match = fact.match(/^(.+)\s+USES\s+(.+)$/);
    if (match && match[1] && match[2]) {
      relationships.push({
        project: match[1],
        technology: match[2]
      });
    }
  }
  
  return relationships;
}

function parseOccursInRelationships(facts: string[]): Array<{ session: string; project: string }> {
  const relationships = [];
  
  for (const fact of facts) {
    const match = fact.match(/^session-([^\s]+)\s+OCCURS_IN\s+(.+)$/);
    if (match && match[1] && match[2]) {
      relationships.push({
        session: match[1],
        project: match[2]
      });
    }
  }
  
  return relationships;
}