/**
 * Unit Tests for Search and Analytics Business Logic
 * Tests search algorithms, analytics calculations, and data processing
 */

import { assertEquals, assertArrayIncludes, assert } from "https://deno.land/std@0.220.1/assert/mod.ts";

/**
 * Mock data for testing analytics business logic
 */
const mockProjects = [
  {
    id: "project-a",
    name: "Project A",
    technologies: ["TypeScript", "React", "Node.js"],
    conversations: 25,
    lastActivity: "2024-01-20T10:00:00Z",
    organization: "TechCorp"
  },
  {
    id: "project-b", 
    name: "Project B",
    technologies: ["Python", "Django", "PostgreSQL"],
    conversations: 15,
    lastActivity: "2024-01-15T10:00:00Z",
    organization: "DataCorp"
  },
  {
    id: "project-c",
    name: "Project C", 
    technologies: ["TypeScript", "Vue.js", "MongoDB"],
    conversations: 10,
    lastActivity: "2024-01-10T10:00:00Z",
    organization: "TechCorp"
  }
];

const mockTechnologies = [
  { name: "TypeScript", projects: ["project-a", "project-c"], confidence: [0.95, 0.90], conversations: [25, 10] },
  { name: "React", projects: ["project-a"], confidence: [0.90], conversations: [25] },
  { name: "Python", projects: ["project-b"], confidence: [0.95], conversations: [15] },
  { name: "Vue.js", projects: ["project-c"], confidence: [0.85], conversations: [10] }
];

/**
 * Business Logic Tests - Portfolio Analytics
 */

Deno.test("Portfolio Analytics - Project Scoring", async (t) => {
  await t.step("should calculate tech expertise score correctly", () => {
    const project = mockProjects[0]; // Project A
    const score = calculateTechExpertiseScore(project.technologies.length, project.conversations, 0.9);
    
    // Formula: technologies * 2 + conversations * 0.5 + confidence_avg * 10
    const expected = 3 * 2 + 25 * 0.5 + 0.9 * 10; // 6 + 12.5 + 9 = 27.5
    assertEquals(score, 27.5);
  });

  await t.step("should handle projects with no technologies", () => {
    const score = calculateTechExpertiseScore(0, 10, 0);
    assertEquals(score, 5.0); // Only conversation score: 10 * 0.5
  });

  await t.step("should sort projects by expertise score", () => {
    const projects = mockProjects.map(p => ({
      ...p,
      expertiseScore: calculateTechExpertiseScore(p.technologies.length, p.conversations, 0.9)
    }));

    const sorted = sortProjectsByExpertise(projects);
    
    assert(sorted[0].expertiseScore >= sorted[1].expertiseScore, "Projects should be sorted by expertise score");
    assert(sorted[1].expertiseScore >= sorted[2].expertiseScore, "Projects should be sorted by expertise score");
  });

  await t.step("should calculate activity score from recent conversations", () => {
    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days ago
    const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(); // 35 days ago
    
    const recentScore = calculateActivityScore(25, recentDate);
    const oldScore = calculateActivityScore(25, oldDate);
    
    assert(recentScore > oldScore, "Recent activity should have higher score");
    assert(recentScore > 0 && recentScore <= 1, "Activity score should be normalized 0-1");
  });
});

Deno.test("Technology Expertise - Analysis Logic", async (t) => {
  await t.step("should calculate total technology experience correctly", () => {
    const tsExpertise = calculateTechnologyExpertise(mockTechnologies[0]);
    
    assertEquals(tsExpertise.technology, "TypeScript");
    assertEquals(tsExpertise.projectsUsing.length, 2);
    assertEquals(tsExpertise.totalExperience, 1.85); // 0.95 + 0.90
    assertEquals(tsExpertise.confidenceScore, 0.95); // Max confidence
  });

  await t.step("should rank technologies by total experience", () => {
    const expertise = mockTechnologies.map(calculateTechnologyExpertise);
    const ranked = rankTechnologiesByExperience(expertise);
    
    assertEquals(ranked[0].technology, "TypeScript"); // Highest total experience
    assert(ranked[0].totalExperience >= ranked[1].totalExperience);
  });

  await t.step("should calculate usage context correctly", () => {
    const tsExpertise = calculateTechnologyExpertise(mockTechnologies[0]);
    
    assertArrayIncludes(tsExpertise.usageContext, ["Used in 25 conversations", "Used in 10 conversations"]);
    assertEquals(tsExpertise.usageContext.length, 2);
  });

  await t.step("should filter technologies by minimum usage threshold", () => {
    const filtered = filterTechnologiesByUsage(mockTechnologies, 20); // Min 20 conversations
    
    assertEquals(filtered.length, 2); // Only TypeScript (25+10=35) and React (25) meet threshold
    assertArrayIncludes(filtered.map(t => t.name), ["TypeScript", "React"]);
  });
});

Deno.test("Cross-Project Pattern Analysis - Logic", async (t) => {
  await t.step("should group patterns by project correctly", () => {
    const patterns = [
      { content: "authentication implemented in project-a", projectId: "project-a", score: 0.9 },
      { content: "authentication pattern in project-c", projectId: "project-c", score: 0.8 },
      { content: "database setup in project-b", projectId: "project-b", score: 0.7 }
    ];
    
    const grouped = groupPatternsByProject(patterns);
    
    assertEquals(Object.keys(grouped).length, 3);
    assertEquals(grouped["project-a"].length, 1);
    assertEquals(grouped["project-c"].length, 1);
    assertEquals(grouped["project-b"].length, 1);
  });

  await t.step("should calculate relevance score for pattern matches", () => {
    const matches = [
      { score: 0.9, content: "High relevance" },
      { score: 0.7, content: "Medium relevance" },
      { score: 0.5, content: "Low relevance" }
    ];
    
    const relevanceScore = calculatePatternRelevance(matches);
    assertEquals(relevanceScore, 2.1); // Sum of scores: 0.9 + 0.7 + 0.5
  });

  await t.step("should rank projects by pattern relevance", () => {
    const projectPatterns = {
      "project-a": [{ score: 0.9 }, { score: 0.8 }],
      "project-b": [{ score: 0.7 }],
      "project-c": [{ score: 0.95 }, { score: 0.85 }, { score: 0.75 }]
    };
    
    const ranked = rankProjectsByPatternRelevance(projectPatterns);
    
    assertEquals(ranked[0].projectId, "project-c"); // Highest total relevance (2.55)
    assertEquals(ranked[1].projectId, "project-a"); // Second highest (1.7)
    assertEquals(ranked[2].projectId, "project-b"); // Lowest (0.7)
  });
});

Deno.test("Search Filtering and Ranking - Logic", async (t) => {
  await t.step("should apply confidence threshold filtering", () => {
    const results = [
      { content: "High confidence", score: 0.9 },
      { content: "Medium confidence", score: 0.7 },
      { content: "Low confidence", score: 0.4 }
    ];
    
    const filtered = applyConfidenceThreshold(results, 0.6);
    
    assertEquals(filtered.length, 2);
    assertArrayIncludes(filtered.map(r => r.content), ["High confidence", "Medium confidence"]);
  });

  await t.step("should apply project context filtering", () => {
    const results = [
      { content: "project-a related", metadata: { projectId: "project-a" } },
      { content: "project-b related", metadata: { projectId: "project-b" } },
      { content: "general content", metadata: {} }
    ];
    
    const filtered = filterByProjectContext(results, "project-a");
    
    assertEquals(filtered.length, 1);
    assertEquals(filtered[0].content, "project-a related");
  });

  await t.step("should rank results by multiple criteria", () => {
    const results = [
      { content: "A", score: 0.8, lastActivity: "2024-01-20T10:00:00Z", conversationCount: 10 },
      { content: "B", score: 0.9, lastActivity: "2024-01-10T10:00:00Z", conversationCount: 5 },
      { content: "C", score: 0.7, lastActivity: "2024-01-25T10:00:00Z", conversationCount: 15 }
    ];
    
    const ranked = rankByMultipleCriteria(results, ["score", "conversationCount", "recency"]);
    
    // Should prioritize by combined score - B has highest individual score (0.9)
    assertEquals(ranked[0].content, "B"); // Highest score wins despite lower activity
    assert(ranked[0].combinedScore > ranked[1].combinedScore);
  });

  await t.step("should handle empty result sets gracefully", () => {
    const emptyFiltered = applyConfidenceThreshold([], 0.5);
    const emptyProjectFiltered = filterByProjectContext([], "project-a");
    const emptyRanked = rankByMultipleCriteria([], ["score"]);
    
    assertEquals(emptyFiltered.length, 0);
    assertEquals(emptyProjectFiltered.length, 0);
    assertEquals(emptyRanked.length, 0);
  });
});

Deno.test("Statistical Calculations - Business Logic", async (t) => {
  await t.step("should calculate organization distribution correctly", () => {
    const distribution = calculateOrganizationDistribution(mockProjects);
    
    assertEquals(distribution["TechCorp"], 2);
    assertEquals(distribution["DataCorp"], 1);
    assertEquals(Object.keys(distribution).length, 2);
  });

  await t.step("should calculate technology usage statistics", () => {
    const stats = calculateTechnologyUsageStats(mockProjects);
    
    assertEquals(stats.totalUniqueTechnologies, 8); // TypeScript, React, Node.js, Python, Django, PostgreSQL, Vue.js, MongoDB
    assertEquals(stats.mostUsedTechnology, "TypeScript"); // Used in 2 projects
    assert(stats.averageTechnologiesPerProject > 0);
  });

  await t.step("should calculate conversation metrics", () => {
    const metrics = calculateConversationMetrics(mockProjects);
    
    assertEquals(metrics.totalConversations, 50); // 25 + 15 + 10
    assertEquals(metrics.averageConversationsPerProject, 16.67); // 50/3, rounded
    assertEquals(metrics.mostActiveProject, "project-a");
  });

  await t.step("should handle edge cases in statistics", () => {
    const emptyStats = calculateTechnologyUsageStats([]);
    const singleProjectStats = calculateTechnologyUsageStats([mockProjects[0]]);
    
    assertEquals(emptyStats.totalUniqueTechnologies, 0);
    assertEquals(emptyStats.mostUsedTechnology, undefined);
    
    assertEquals(singleProjectStats.totalUniqueTechnologies, 3);
    assertEquals(singleProjectStats.mostUsedTechnology, "TypeScript"); // First in alphabetical order
  });
});

/**
 * Helper functions for business logic testing
 */

function calculateTechExpertiseScore(techCount: number, conversations: number, avgConfidence: number): number {
  return techCount * 2 + conversations * 0.5 + avgConfidence * 10;
}

function sortProjectsByExpertise(projects: any[]): any[] {
  return [...projects].sort((a, b) => b.expertiseScore - a.expertiseScore);
}

function calculateActivityScore(conversations: number, lastActivity: string): number {
  const now = new Date();
  const lastDate = new Date(lastActivity);
  const daysSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
  
  // Decay factor: more recent = higher score
  const recencyScore = Math.max(0, 1 - (daysSince / 30)); // 30-day decay
  const conversationScore = Math.min(conversations / 100, 1); // Normalize to max 1
  
  return (recencyScore * 0.6 + conversationScore * 0.4);
}

function calculateTechnologyExpertise(tech: any) {
  return {
    technology: tech.name,
    confidenceScore: Math.max(...tech.confidence),
    projectsUsing: tech.projects,
    usageContext: tech.conversations.map((count: number) => `Used in ${count} conversations`),
    totalExperience: tech.confidence.reduce((sum: number, conf: number) => sum + conf, 0)
  };
}

function rankTechnologiesByExperience(technologies: any[]): any[] {
  return [...technologies].sort((a, b) => b.totalExperience - a.totalExperience);
}

function filterTechnologiesByUsage(technologies: any[], minConversations: number) {
  return technologies.filter(tech => {
    const totalConversations = tech.conversations.reduce((sum: number, count: number) => sum + count, 0);
    return totalConversations >= minConversations;
  });
}

function groupPatternsByProject(patterns: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  
  for (const pattern of patterns) {
    if (!grouped[pattern.projectId]) {
      grouped[pattern.projectId] = [];
    }
    grouped[pattern.projectId].push(pattern);
  }
  
  return grouped;
}

function calculatePatternRelevance(matches: any[]): number {
  return matches.reduce((sum, match) => sum + match.score, 0);
}

function rankProjectsByPatternRelevance(projectPatterns: Record<string, any[]>) {
  const projects = Object.entries(projectPatterns).map(([projectId, patterns]) => ({
    projectId,
    relevanceScore: calculatePatternRelevance(patterns),
    matchCount: patterns.length
  }));
  
  return projects.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function applyConfidenceThreshold(results: any[], threshold: number): any[] {
  return results.filter(result => result.score >= threshold);
}

function filterByProjectContext(results: any[], projectId: string): any[] {
  return results.filter(result => result.metadata?.projectId === projectId);
}

function rankByMultipleCriteria(results: any[], criteria: string[]): any[] {
  return results.map(result => {
    let combinedScore = 0;
    
    for (const criterion of criteria) {
      switch (criterion) {
        case "score":
          combinedScore += result.score * 0.4;
          break;
        case "conversationCount":
          combinedScore += (result.conversationCount / 100) * 0.3;
          break;
        case "recency":
          const daysSince = (Date.now() - new Date(result.lastActivity).getTime()) / (1000 * 60 * 60 * 24);
          combinedScore += Math.max(0, 1 - (daysSince / 30)) * 0.3;
          break;
      }
    }
    
    return { ...result, combinedScore };
  }).sort((a, b) => b.combinedScore - a.combinedScore);
}

function calculateOrganizationDistribution(projects: any[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  
  for (const project of projects) {
    const org = project.organization || "Unknown";
    distribution[org] = (distribution[org] || 0) + 1;
  }
  
  return distribution;
}

function calculateTechnologyUsageStats(projects: any[]) {
  if (projects.length === 0) {
    return {
      totalUniqueTechnologies: 0,
      mostUsedTechnology: undefined,
      averageTechnologiesPerProject: 0
    };
  }
  
  const techCounts: Record<string, number> = {};
  let totalTechCount = 0;
  
  for (const project of projects) {
    totalTechCount += project.technologies.length;
    for (const tech of project.technologies) {
      techCounts[tech] = (techCounts[tech] || 0) + 1;
    }
  }
  
  const mostUsed = Object.entries(techCounts).sort(([,a], [,b]) => b - a)[0];
  
  return {
    totalUniqueTechnologies: Object.keys(techCounts).length,
    mostUsedTechnology: mostUsed ? mostUsed[0] : undefined,
    averageTechnologiesPerProject: Math.round((totalTechCount / projects.length) * 100) / 100
  };
}

function calculateConversationMetrics(projects: any[]) {
  const totalConversations = projects.reduce((sum, p) => sum + p.conversations, 0);
  const avgConversations = Math.round((totalConversations / projects.length) * 100) / 100;
  const mostActive = projects.sort((a, b) => b.conversations - a.conversations)[0];
  
  return {
    totalConversations,
    averageConversationsPerProject: avgConversations,
    mostActiveProject: mostActive ? mostActive.id : undefined
  };
}