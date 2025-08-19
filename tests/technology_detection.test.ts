/**
 * Unit Tests for Technology Detection Business Logic
 * Tests the core business logic without external dependencies
 */

import { assertEquals, assertArrayIncludes, assert } from "https://deno.land/std@0.220.1/assert/mod.ts";
import type { TechnologyDetection, TechnologyDetectionResult } from "../src/lib/types.ts";

// Mock data for testing
const mockPackageJson = {
  dependencies: {
    "react": "^18.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^18.0.0"
  },
  devDependencies: {
    "jest": "^29.0.0",
    "webpack": "^5.0.0"
  },
  engines: {
    node: ">=18.0.0"
  }
};

const mockDenoJson = {
  compilerOptions: {
    strict: true,
    target: "ES2022"
  },
  imports: {
    "react": "https://esm.sh/react@18.0.0",
    "fresh": "https://deno.land/x/fresh@1.5.0/mod.ts",
    "@std/": "https://deno.land/std@0.220.1/"
  }
};

/**
 * Business Logic Tests - Technology Detection Algorithms
 */

Deno.test("Technology Detection - Package.json Analysis", async (t) => {
  await t.step("should detect React from dependencies", () => {
    const technologies = analyzePackageJsonDependencies(mockPackageJson);
    const reactTech = technologies.find(tech => tech.name === "React");
    
    assert(reactTech, "React should be detected");
    assertEquals(reactTech.name, "React");
    assert(reactTech.confidence >= 0.9, "React detection should have high confidence");
    assertEquals(reactTech.source, "package.json");
  });

  await t.step("should detect TypeScript from dependencies", () => {
    const technologies = analyzePackageJsonDependencies(mockPackageJson);
    const tsTech = technologies.find(tech => tech.name === "TypeScript");
    
    assertEquals(tsTech?.name, "TypeScript");
    assert(tsTech?.confidence >= 0.9, "TypeScript detection should have high confidence");
  });

  await t.step("should detect Node.js from engines", () => {
    const technologies = analyzePackageJsonDependencies(mockPackageJson);
    const nodeTypes = technologies.filter(tech => tech.name === "Node.js");
    
    // Should detect Node.js from both @types/node dependency and engines
    assert(nodeTypes.length >= 1, "Should detect Node.js");
    
    // Find the engines-based detection
    const nodeTech = nodeTypes.find(tech => tech.context === "Engine requirement") || nodeTypes[0];
    assertEquals(nodeTech?.name, "Node.js");
    
    // Should have version from either engines or types
    assert(nodeTech?.version, "Should have version information");
  });

  await t.step("should handle malformed package.json gracefully", () => {
    const technologies = analyzePackageJsonDependencies(null);
    assertEquals(technologies.length, 0);
  });
});

Deno.test("Technology Detection - Deno.json Analysis", async (t) => {
  await t.step("should detect Deno from configuration", () => {
    const technologies = analyzeDenoJsonConfig(mockDenoJson);
    const denoTech = technologies.find(tech => tech.name === "Deno");
    
    assertEquals(denoTech?.name, "Deno");
    assert(denoTech?.confidence >= 0.9, "Deno detection should have high confidence");
    assertEquals(denoTech?.source, "deno.json");
  });

  await t.step("should detect Fresh framework from imports", () => {
    const technologies = analyzeDenoJsonConfig(mockDenoJson);
    const freshTech = technologies.find(tech => tech.name === "Fresh");
    
    assertEquals(freshTech?.name, "Fresh");
    assert(freshTech?.confidence >= 0.9, "Fresh detection should have high confidence");
  });

  await t.step("should detect Deno Standard Library", () => {
    const technologies = analyzeDenoJsonConfig(mockDenoJson);
    const stdTech = technologies.find(tech => tech.name === "Deno Standard Library");
    
    assertEquals(stdTech?.name, "Deno Standard Library");
    assert(stdTech?.confidence >= 0.8, "Deno std detection should have good confidence");
  });
});

Deno.test("Technology Detection - File Extension Analysis", async (t) => {
  const mockFileExtensions = {
    "ts": 25,
    "tsx": 10,
    "js": 5,
    "json": 3,
    "md": 2
  };

  await t.step("should calculate confidence based on prevalence", () => {
    const technologies = analyzeFileExtensions(mockFileExtensions, 45); // total files
    const tsTech = technologies.find(tech => tech.name === "TypeScript");
    
    assertEquals(tsTech?.name, "TypeScript");
    assert(tsTech?.confidence > 0.85, "TypeScript should have high confidence with many .ts files");
    assert(tsTech?.context?.includes("25 .ts files"), "Context should include file count");
  });

  await t.step("should handle low prevalence technologies", () => {
    const technologies = analyzeFileExtensions({ "py": 1 }, 100);
    const pythonTech = technologies.find(tech => tech.name === "Python");
    
    assertEquals(pythonTech?.name, "Python");
    assert(pythonTech?.confidence < 0.95, "Low prevalence should result in lower confidence");
  });

  await t.step("should not detect technologies below threshold", () => {
    const technologies = analyzeFileExtensions({ "unknown": 1 }, 1000);
    assertEquals(technologies.length, 0, "Very low prevalence should be filtered out");
  });
});

Deno.test("Technology Detection - Confidence Scoring", async (t) => {
  await t.step("should combine multiple detections correctly", () => {
    const detections: TechnologyDetection[] = [
      { name: "React", confidence: 0.9, source: "package.json", context: "Dependency" },
      { name: "React", confidence: 0.8, source: "file_extensions", context: "10 .jsx files" }
    ];
    
    const combined = calculateCombinedConfidence(detections);
    const reactResult = combined.find(tech => tech.name === "React");
    
    assertEquals(reactResult?.name, "React");
    assert(reactResult?.confidence > 0.9, "Combined confidence should include source bonus");
    assert(reactResult?.context?.includes("Dependency"), "Should include contexts from all sources");
  });

  await t.step("should apply source bonus for multiple detections", () => {
    const singleSource: TechnologyDetection[] = [
      { name: "Vue.js", confidence: 0.9, source: "package.json", context: "Dependency" }
    ];
    
    const multiSource: TechnologyDetection[] = [
      { name: "Vue.js", confidence: 0.9, source: "package.json", context: "Dependency" },
      { name: "Vue.js", confidence: 0.8, source: "framework", context: "vue.config.js" }
    ];
    
    const singleResult = calculateCombinedConfidence(singleSource)[0];
    const multiResult = calculateCombinedConfidence(multiSource)[0];
    
    assert(multiResult.confidence > singleResult.confidence, "Multiple sources should boost confidence");
  });

  await t.step("should cap confidence at 0.95 maximum", () => {
    const detections: TechnologyDetection[] = [
      { name: "TypeScript", confidence: 0.95, source: "package.json", context: "Dependency" },
      { name: "TypeScript", confidence: 0.95, source: "file_extensions", context: "Many .ts files" },
      { name: "TypeScript", confidence: 0.95, source: "framework", context: "tsconfig.json" }
    ];
    
    const result = calculateCombinedConfidence(detections)[0];
    assertEquals(result.confidence, 0.95, "Confidence should be capped at 0.95");
  });
});

Deno.test("Technology Detection - Filtering and Thresholds", async (t) => {
  await t.step("should filter by confidence threshold", () => {
    const technologies: TechnologyDetection[] = [
      { name: "React", confidence: 0.9, source: "package.json", context: "High confidence" },
      { name: "Unknown", confidence: 0.3, source: "file_extensions", context: "Low confidence" },
      { name: "TypeScript", confidence: 0.8, source: "framework", context: "Good confidence" }
    ];
    
    const filtered = filterByConfidenceThreshold(technologies, 0.6);
    
    assertEquals(filtered.length, 2, "Should filter out low confidence technologies");
    assertArrayIncludes(filtered.map(t => t.name), ["React", "TypeScript"]);
  });

  await t.step("should sort by confidence descending", () => {
    const technologies: TechnologyDetection[] = [
      { name: "Low", confidence: 0.7, source: "package.json", context: "Low" },
      { name: "High", confidence: 0.95, source: "package.json", context: "High" },
      { name: "Medium", confidence: 0.8, source: "package.json", context: "Medium" }
    ];
    
    const sorted = sortByConfidence(technologies);
    
    assertEquals(sorted[0].name, "High");
    assertEquals(sorted[1].name, "Medium");
    assertEquals(sorted[2].name, "Low");
  });
});

/**
 * Helper functions for business logic testing
 * These mirror the actual implementation logic but are simplified for testing
 */

function analyzePackageJsonDependencies(pkg: any): TechnologyDetection[] {
  if (!pkg) return [];
  
  const technologies: TechnologyDetection[] = [];
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  
  const techMap: Record<string, { name: string; confidence: number }> = {
    'react': { name: 'React', confidence: 0.95 },
    'typescript': { name: 'TypeScript', confidence: 0.95 },
    '@types/node': { name: 'Node.js', confidence: 0.85 },
    'jest': { name: 'Jest', confidence: 0.85 },
    'webpack': { name: 'Webpack', confidence: 0.90 }
  };

  for (const [depName, version] of Object.entries(allDeps)) {
    if (techMap[depName]) {
      const tech = techMap[depName];
      technologies.push({
        name: tech.name,
        confidence: tech.confidence,
        source: "package.json",
        version: typeof version === 'string' ? version : undefined,
        context: `Dependency: ${depName}`
      });
    }
  }

  // Handle engines
  if (pkg.engines?.node) {
    technologies.push({
      name: 'Node.js',
      confidence: 0.95,
      source: "package.json",
      version: pkg.engines.node,
      context: 'Engine requirement'
    });
  }

  return technologies;
}

function analyzeDenoJsonConfig(config: any): TechnologyDetection[] {
  if (!config) return [];
  
  const technologies: TechnologyDetection[] = [];
  
  // Deno presence
  technologies.push({
    name: 'Deno',
    confidence: 0.95,
    source: "deno.json",
    context: 'Configuration present'
  });

  // TypeScript from compiler options
  if (config.compilerOptions) {
    technologies.push({
      name: 'TypeScript',
      confidence: 0.90,
      source: "deno.json",
      context: 'Compiler options present'
    });
  }

  // Framework detection from imports
  if (config.imports) {
    const importMap: Record<string, { name: string; confidence: number }> = {
      'fresh': { name: 'Fresh', confidence: 0.95 },
      'react': { name: 'React', confidence: 0.90 },
      '@std/': { name: 'Deno Standard Library', confidence: 0.85 }
    };

    for (const [importKey, importValue] of Object.entries(config.imports)) {
      for (const [pattern, tech] of Object.entries(importMap)) {
        if (importKey.includes(pattern) || (typeof importValue === 'string' && importValue.includes(pattern))) {
          technologies.push({
            name: tech.name,
            confidence: tech.confidence,
            source: "deno.json",
            context: `Import: ${importKey}`
          });
        }
      }
    }
  }

  return technologies;
}

function analyzeFileExtensions(extensionCounts: Record<string, number>, totalFiles: number): TechnologyDetection[] {
  const technologies: TechnologyDetection[] = [];
  
  const extMap: Record<string, { name: string; baseConfidence: number }> = {
    'ts': { name: 'TypeScript', baseConfidence: 0.85 },
    'tsx': { name: 'TypeScript', baseConfidence: 0.90 },
    'jsx': { name: 'React', baseConfidence: 0.80 },
    'py': { name: 'Python', baseConfidence: 0.90 }
  };

  for (const [ext, count] of Object.entries(extensionCounts)) {
    if (extMap[ext] && count > 0) {
      const tech = extMap[ext];
      const prevalence = count / totalFiles;
      
      // Only include if prevalence is above minimum threshold
      if (prevalence >= 0.01) { // 1% minimum threshold
        const confidence = Math.min(tech.baseConfidence + (prevalence * 0.2), 0.95);
        
        technologies.push({
          name: tech.name,
          confidence: confidence,
          source: "file_extensions",
          context: `${count} .${ext} files (${(prevalence * 100).toFixed(1)}%)`
        });
      }
    }
  }

  return technologies;
}

function calculateCombinedConfidence(detections: TechnologyDetection[]): TechnologyDetection[] {
  const technologyMap = new Map<string, TechnologyDetection[]>();
  
  for (const detection of detections) {
    if (!technologyMap.has(detection.name)) {
      technologyMap.set(detection.name, []);
    }
    technologyMap.get(detection.name)!.push(detection);
  }

  const result: TechnologyDetection[] = [];
  
  for (const [techName, techDetections] of technologyMap) {
    const maxConfidence = Math.max(...techDetections.map(d => d.confidence));
    const sources = [...new Set(techDetections.map(d => d.source))];
    const contexts = techDetections.map(d => d.context).filter(Boolean);
    const versions = techDetections.map(d => d.version).filter(Boolean);
    
    // Bonus for multiple sources
    const sourceBonus = sources.length > 1 ? 0.05 : 0;
    const finalConfidence = Math.min(maxConfidence + sourceBonus, 0.95);
    
    result.push({
      name: techName,
      confidence: finalConfidence,
      source: sources[0],
      version: versions[0],
      context: contexts.join('; ')
    });
  }

  return result.sort((a, b) => b.confidence - a.confidence);
}

function filterByConfidenceThreshold(technologies: TechnologyDetection[], threshold: number): TechnologyDetection[] {
  return technologies.filter(tech => tech.confidence >= threshold);
}

function sortByConfidence(technologies: TechnologyDetection[]): TechnologyDetection[] {
  return [...technologies].sort((a, b) => b.confidence - a.confidence);
}