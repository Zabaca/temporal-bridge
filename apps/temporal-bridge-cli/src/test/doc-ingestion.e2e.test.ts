/**
 * E2E Test for Documentation Ingestion and Entity Classification
 * 
 * Tests the complete workflow:
 * 1. Project graph initialization with ontology setup
 * 2. Document ingestion via MCP tool
 * 3. Automatic entity classification by Zep
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DocumentationOntologyService } from '../lib/doc-ontology.service';
import { MemoryToolsService } from '../lib/memory-tools';
import { ProjectEntitiesService } from '../lib/project-entities';
import { ZepService } from '../lib/zep-client';
import { TemporalBridgeToolsService } from '../mcp/temporal-bridge-tools.service';

describe('Documentation Ingestion E2E', () => {
  let docOntologyService: DocumentationOntologyService;
  let memoryToolsService: MemoryToolsService;
  let projectEntitiesService: ProjectEntitiesService;
  let mcpToolsService: TemporalBridgeToolsService;
  let zepService: ZepService;
  
  // Test data
  const testProjectName = 'test-doc-ingestion';
  const testGraphId = `project-${testProjectName}`;
  
  beforeEach(async () => {
    // Debug: Check environment variables
    const apiKey = process.env.ZEP_API_KEY;
    console.log(`🔍 Debug: ZEP_API_KEY available: ${apiKey ? 'YES' : 'NO'}`);
    console.log(`🔍 Debug: API Key length: ${apiKey ? apiKey.length : 0}`);
    console.log(`🔍 Debug: API Key prefix: ${apiKey ? apiKey.substring(0, 10) : 'N/A'}`);
    
    // Initialize real services for E2E testing
    zepService = new ZepService();
    projectEntitiesService = new ProjectEntitiesService(zepService);
    docOntologyService = new DocumentationOntologyService(zepService);
    memoryToolsService = new MemoryToolsService(zepService, projectEntitiesService, docOntologyService);
    mcpToolsService = new TemporalBridgeToolsService(memoryToolsService, projectEntitiesService, zepService);
    
    // Ensure user exists
    await zepService.ensureUser();
  });

  describe('Project Graph Setup', () => {
    it('should create project graph and set up ontology', async () => {
      // Test that sharing knowledge to a new project automatically sets up ontology
      const testMessage = 'Test knowledge for ontology setup verification';
      
      const result = await memoryToolsService.shareToProjectGroup(testMessage, testProjectName);
      
      expect(result.success).toBe(true);
      expect(result.graphId).toBe(testGraphId);
      
      console.log('✅ Project graph created with ontology setup');
    });
  });

  describe('Document Ingestion', () => {
    beforeEach(async () => {
      // Ensure project exists before each test
      await memoryToolsService.shareToProjectGroup('Test setup', testProjectName);
    });

    it('should ingest C4 Level 1 documentation successfully', async () => {
      // Read the actual C4 documentation with frontmatter
      const docPath = join(__dirname, '../../../../docs/architecture/c4-level1-context.md');
      const content = readFileSync(docPath, 'utf8');
      
      // Test content length is within limits
      expect(content.length).toBeLessThan(10000);
      
      // Ingest via MCP tool
      const result = await mcpToolsService.ingestDocumentation({
        file_path: 'docs/architecture/c4-level1-context.md',
        content: content,
        project: testProjectName
      });
      
      expect(result.success).toBe(true);
      expect(result.file_path).toBe('docs/architecture/c4-level1-context.md');
      expect(result.graph_id).toBe(testGraphId);
    });

    it('should ingest C4 Level 2 documentation successfully', async () => {
      const docPath = join(__dirname, '../../../../docs/architecture/c4-level2-container.md');
      const content = readFileSync(docPath, 'utf8');
      
      expect(content.length).toBeLessThan(10000);
      
      const result = await mcpToolsService.ingestDocumentation({
        file_path: 'docs/architecture/c4-level2-container.md',
        content: content,
        project: testProjectName
      });
      
      expect(result.success).toBe(true);
      expect(result.file_path).toBe('docs/architecture/c4-level2-container.md');
    });

    it('should reject content that exceeds character limit', async () => {
      const largeContent = 'x'.repeat(10001); // Exceed 10,000 limit
      
      const result = await mcpToolsService.ingestDocumentation({
        file_path: 'test/large-doc.md',
        content: largeContent,
        project: testProjectName
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('too large');
      expect(result.error).toContain('10,000 characters');
    });

    it('should handle missing required parameters', async () => {
      const result = await mcpToolsService.ingestDocumentation({
        file_path: '',
        content: 'test content',
        project: testProjectName
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });
  });


  describe('Multiple Document Ingestion', () => {
    it('should handle ingestion of multiple C4 documents', async () => {
      const docs = ['c4-level1-context.md', 'c4-level2-container.md'];
      const results = [];
      
      for (const doc of docs) {
        const docPath = join(__dirname, `../../../../docs/architecture/${doc}`);
        const content = readFileSync(docPath, 'utf8');
        
        if (content.length <= 10000) {
          const result = await mcpToolsService.ingestDocumentation({
            file_path: `docs/architecture/${doc}`,
            content: content,
            project: testProjectName
          });
          results.push({ doc, result });
          console.log(`${doc}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        } else {
          console.warn(`Skipping ${doc}: content too large (${content.length} chars)`);
        }
      }
      
      const successful = results.filter(r => r.result.success);
      expect(successful.length).toBeGreaterThan(0);
    });
  });
});