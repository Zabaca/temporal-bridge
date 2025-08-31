/**
 * Documentation Ontology Unit Tests
 * 
 * Tests ontology validation, limits checking, and service functionality
 * without requiring actual Zep API calls.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import {
  DocumentationEntityTypes,
  DocumentationEdgeTypes,
  validateOntologyLimits,
  ONTOLOGY_LIMITS,
} from '../lib/doc-ontology';
import { DocumentationOntologyService } from '../lib/doc-ontology.service';
import { ZepService } from '../lib/zep-client';

describe('Documentation Ontology Validation', () => {
  describe('validateOntologyLimits', () => {
    it('should validate that ontology fits within Zep limits', () => {
      const validation = validateOntologyLimits();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.entityCount).toBeLessThanOrEqual(ONTOLOGY_LIMITS.MAX_ENTITY_TYPES);
      expect(validation.edgeCount).toBeLessThanOrEqual(ONTOLOGY_LIMITS.MAX_EDGE_TYPES);
    });

    it('should report current entity and edge type counts', () => {
      const validation = validateOntologyLimits();
      
      expect(validation.entityCount).toBe(3); // Architecture, DataModel, ArchitectureDecision
      expect(validation.edgeCount).toBe(6); // Documents, Implements, Supersedes, DependsOn, UsesDataModel, AffectedBy
    });

    it('should validate field counts for each entity type', () => {
      const validation = validateOntologyLimits();
      
      // Check that no entity type exceeds field limit
      for (const [_name, schema] of Object.entries(DocumentationEntityTypes)) {
        const fieldCount = Object.keys(schema.fields).length;
        expect(fieldCount).toBeLessThanOrEqual(ONTOLOGY_LIMITS.MAX_FIELDS_PER_TYPE);
      }
      
      expect(validation.valid).toBe(true);
    });
  });

  describe('Entity Type Definitions', () => {
    it('should have all required entity types defined', () => {
      const expectedTypes = ['Architecture', 'DataModel', 'ArchitectureDecision'];
      const actualTypes = Object.keys(DocumentationEntityTypes);
      
      expect(actualTypes).toEqual(expect.arrayContaining(expectedTypes));
      expect(actualTypes).toHaveLength(3);
    });

    it('should have descriptive entity descriptions', () => {
      for (const [_name, schema] of Object.entries(DocumentationEntityTypes)) {
        expect(schema.description).toBeTruthy();
        expect(schema.description.length).toBeGreaterThan(20); // Meaningful description
        expect(typeof schema.description).toBe('string');
      }
    });

    it('should have proper field definitions for Architecture entity', () => {
      const archSchema = DocumentationEntityTypes.Architecture;
      
      expect(archSchema.fields).toHaveProperty('component_type');
      expect(archSchema.fields).toHaveProperty('c4_layer');
      expect(archSchema.fields).toHaveProperty('technology_stack');
      expect(archSchema.fields).toHaveProperty('deployment_model');
      expect(archSchema.fields).toHaveProperty('status');
      
      // Check field count
      expect(Object.keys(archSchema.fields)).toHaveLength(5);
    });

    it('should have proper field definitions for DataModel entity', () => {
      const dataSchema = DocumentationEntityTypes.DataModel;
      
      expect(dataSchema.fields).toHaveProperty('model_type');
      expect(dataSchema.fields).toHaveProperty('storage_layer');
      expect(dataSchema.fields).toHaveProperty('schema_format');
      expect(dataSchema.fields).toHaveProperty('version');
      expect(dataSchema.fields).toHaveProperty('validation_rules');
      
      // Check field count
      expect(Object.keys(dataSchema.fields)).toHaveLength(5);
    });

    it('should have proper field definitions for ArchitectureDecision entity', () => {
      const adrSchema = DocumentationEntityTypes.ArchitectureDecision;
      
      expect(adrSchema.fields).toHaveProperty('decision_title');
      expect(adrSchema.fields).toHaveProperty('status');
      expect(adrSchema.fields).toHaveProperty('decision_date');
      expect(adrSchema.fields).toHaveProperty('impact_scope');
      expect(adrSchema.fields).toHaveProperty('alternatives_considered');
      
      // Check field count
      expect(Object.keys(adrSchema.fields)).toHaveLength(5);
    });
  });

  describe('Edge Type Definitions', () => {
    it('should have all required edge types defined', () => {
      const expectedTypes = [
        'Documents', 'Implements', 'Supersedes', 
        'DependsOn', 'UsesDataModel', 'AffectedBy'
      ];
      const actualTypes = Object.keys(DocumentationEdgeTypes);
      
      expect(actualTypes).toEqual(expect.arrayContaining(expectedTypes));
      expect(actualTypes).toHaveLength(6);
    });

    it('should have descriptive edge descriptions', () => {
      for (const [_name, schema] of Object.entries(DocumentationEdgeTypes)) {
        expect(schema.description).toBeTruthy();
        expect(schema.description.length).toBeGreaterThan(15); // Meaningful description
        expect(typeof schema.description).toBe('string');
      }
    });

    it('should have valid source and target types for each edge', () => {
      const validEntityTypes = Object.keys(DocumentationEntityTypes);
      const additionalValidTypes = ['Documentation', 'Requirement']; // Referenced but not defined in MVP
      const allValidTypes = [...validEntityTypes, ...additionalValidTypes];

      for (const [_name, schema] of Object.entries(DocumentationEdgeTypes)) {
        // Check sourceTargets array
        if (schema.sourceTargets) {
          for (const sourceTarget of schema.sourceTargets) {
            expect(allValidTypes).toContain(sourceTarget.source);
            expect(allValidTypes).toContain(sourceTarget.target);
          }
        }
      }
    });
  });

  describe('Ontology Limits Constants', () => {
    it('should have correct Zep limit constants', () => {
      expect(ONTOLOGY_LIMITS.MAX_ENTITY_TYPES).toBe(10);
      expect(ONTOLOGY_LIMITS.MAX_EDGE_TYPES).toBe(10);
      expect(ONTOLOGY_LIMITS.MAX_FIELDS_PER_TYPE).toBe(10);
    });

    it('should have accurate current counts', () => {
      expect(ONTOLOGY_LIMITS.CURRENT_ENTITY_COUNT).toBe(Object.keys(DocumentationEntityTypes).length);
      expect(ONTOLOGY_LIMITS.CURRENT_EDGE_COUNT).toBe(Object.keys(DocumentationEdgeTypes).length);
    });
  });
});

describe('Documentation Ontology Service', () => {
  let service: DocumentationOntologyService;
  let mockZepService: ReturnType<typeof mockDeep<ZepService>>;

  beforeEach(() => {
    mockZepService = mockDeep<ZepService>();
    service = new DocumentationOntologyService(mockZepService);
    
    // Setup default mocks
    mockZepService.ensureUser.mockResolvedValue();
    mockZepService.graph.setOntology.mockResolvedValue(undefined as never);
    mockZepService.graph.listEntityTypes.mockResolvedValue({
      entityTypes: Object.keys(DocumentationEntityTypes),
      edgeTypes: Object.keys(DocumentationEdgeTypes),
    } as never);
  });

  describe('setDocumentationOntology', () => {
    it('should successfully set ontology with validation', async () => {
      const result = await service.setDocumentationOntology();
      
      expect(result.success).toBe(true);
      expect(result.entityTypesSet).toBe(3);
      expect(result.edgeTypesSet).toBe(6);
      expect(result.validation.valid).toBe(true);
      expect(result.message).toContain('project-wide');
      
      // Verify Zep service calls
      expect(mockZepService.ensureUser).toHaveBeenCalledOnce();
      expect(mockZepService.graph.setOntology).toHaveBeenCalledWith(
        DocumentationEntityTypes,
        DocumentationEdgeTypes
      );
    });

    it('should set ontology on specific graph when graphId provided', async () => {
      const testGraphId = 'project-test-project';
      const result = await service.setDocumentationOntology(testGraphId);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain(testGraphId);
      
      expect(mockZepService.graph.setOntology).toHaveBeenCalledWith(
        DocumentationEntityTypes,
        DocumentationEdgeTypes
      );
    });

    it('should handle Zep API errors gracefully', async () => {
      const errorMessage = 'Zep API connection failed';
      mockZepService.graph.setOntology.mockRejectedValue(new Error(errorMessage));
      
      const result = await service.setDocumentationOntology();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain(errorMessage);
      expect(result.entityTypesSet).toBe(0);
      expect(result.edgeTypesSet).toBe(0);
    });
  });

  describe('setProjectOntology', () => {
    it('should use default project graph naming convention', async () => {
      const result = await service.setProjectOntology();
      
      expect(result.success).toBe(true);
    });

    it('should use custom project name for graph ID', async () => {
      const result = await service.setProjectOntology('my-project');
      
      expect(result.success).toBe(true);
    });
  });

  describe('validateOntologySetup', () => {
    it('should validate successful ontology setup', async () => {
      const result = await service.validateOntologySetup();
      
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
    });

    it('should detect missing entity types', async () => {
      mockZepService.graph.listEntityTypes.mockResolvedValue({
        entityTypes: ['Architecture'], // Missing DataModel and ArchitectureDecision
        edgeTypes: Object.keys(DocumentationEdgeTypes),
      } as never);
      
      const result = await service.validateOntologySetup();
      
      expect(result.valid).toBe(false);
      expect(result.issues[0]).toMatch(/Missing entity types/);
      expect(result.recommendations[0]).toMatch(/Re-run ontology setup/);
    });

    it('should detect missing edge types', async () => {
      mockZepService.graph.listEntityTypes.mockResolvedValue({
        entityTypes: Object.keys(DocumentationEntityTypes),
        edgeTypes: ['Documents'], // Missing other edge types
      } as never);
      
      const result = await service.validateOntologySetup();
      
      expect(result.valid).toBe(false);
      expect(result.issues[0]).toMatch(/Missing edge types/);
    });
  });

  describe('getAvailableEntityTypes', () => {
    it('should return complete ontology information', () => {
      const info = service.getAvailableEntityTypes();
      
      expect(info.entityTypes).toHaveProperty('Architecture');
      expect(info.entityTypes).toHaveProperty('DataModel');
      expect(info.entityTypes).toHaveProperty('ArchitectureDecision');
      
      expect(info.edgeTypes).toHaveProperty('Documents');
      expect(info.edgeTypes).toHaveProperty('Implements');
      
      expect(info.limits).toBe(ONTOLOGY_LIMITS);
    });

    it('should include field counts for entity types', () => {
      const info = service.getAvailableEntityTypes();
      
      expect(info.entityTypes.Architecture.fieldCount).toBe(5);
      expect(info.entityTypes.DataModel.fieldCount).toBe(5);
      expect(info.entityTypes.ArchitectureDecision.fieldCount).toBe(5);
    });

    it('should include source/target types for edge types', () => {
      const info = service.getAvailableEntityTypes();
      
      // Check that sourceTargets are properly structured
      expect(info.edgeTypes.Documents.sourceTargets).toBeDefined();
      expect(Array.isArray(info.edgeTypes.Documents.sourceTargets)).toBe(true);
      expect(info.edgeTypes.Documents.sourceTargets.length).toBeGreaterThan(0);
      expect(info.edgeTypes.DependsOn.sourceTargets).toBeDefined();
      expect(Array.isArray(info.edgeTypes.DependsOn.sourceTargets)).toBe(true);
      expect(info.edgeTypes.DependsOn.sourceTargets.length).toBeGreaterThan(0);
    });
  });

  describe('resetOntology', () => {
    it('should reset ontology to empty state', async () => {
      const result = await service.resetOntology();
      
      expect(result.success).toBe(true);
      expect(result.entityTypesSet).toBe(0);
      expect(result.edgeTypesSet).toBe(0);
      expect(result.message).toContain('project-wide');
      
      expect(mockZepService.graph.setOntology).toHaveBeenCalledWith(
        {},
        {}
      );
    });

    it('should reset specific graph ontology', async () => {
      const graphId = 'project-test';
      const result = await service.resetOntology(graphId);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain(graphId);
      
      expect(mockZepService.graph.setOntology).toHaveBeenCalledWith(
        {},
        {}
      );
    });
  });
});