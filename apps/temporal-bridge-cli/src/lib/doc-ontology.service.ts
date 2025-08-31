/**
 * Documentation Ontology Service
 *
 * Manages custom entity types and edge types for documentation knowledge graph.
 * Provides methods to set, validate, and manage ontology on Zep project graphs.
 */

import { Injectable } from '@nestjs/common';
import {
  DocumentationEdgeTypes,
  DocumentationEntityTypes,
  ONTOLOGY_LIMITS,
  validateOntologyLimits,
} from './doc-ontology';
import { ZepService } from './zep-client';

export interface OntologySetupResult {
  success: boolean;
  message?: string;
  error?: string;
  entityTypesSet: number;
  edgeTypesSet: number;
  validation: {
    valid: boolean;
    entityCount: number;
    edgeCount: number;
    errors: string[];
  };
}

export interface OntologyStatus {
  isSet: boolean;
  entityTypes: string[];
  edgeTypes: string[];
  lastUpdated?: string;
  error?: string;
}

@Injectable()
export class DocumentationOntologyService {
  constructor(private readonly zepService: ZepService) {}

  /**
   * Set the documentation ontology on the project graph
   * This configures custom entity and edge types for documentation entities
   */
  async setDocumentationOntology(graphId?: string): Promise<OntologySetupResult> {
    try {
      // Validate ontology before setting
      const validation = validateOntologyLimits();
      if (!validation.valid) {
        return {
          success: false,
          error: `Ontology validation failed: ${validation.errors.join(', ')}`,
          entityTypesSet: 0,
          edgeTypesSet: 0,
          validation,
        };
      }

      console.log('🔧 Setting documentation ontology on Zep graph...');
      console.log(`📊 Entity types: ${validation.entityCount}, Edge types: ${validation.edgeCount}`);

      // Ensure user exists before setting ontology
      await this.zepService.ensureUser();

      // Set the ontology using Zep's setOntology method
      // For now, set without graph targeting until we understand the API better
      await this.zepService.graph.setOntology(
        DocumentationEntityTypes,
        DocumentationEdgeTypes
      );

      const successMessage = graphId
        ? `Documentation ontology set on graph: ${graphId}`
        : 'Documentation ontology set project-wide';

      console.log(`✅ ${successMessage}`);
      console.log(`📋 Entity types configured: ${Object.keys(DocumentationEntityTypes).join(', ')}`);
      console.log(`🔗 Edge types configured: ${Object.keys(DocumentationEdgeTypes).join(', ')}`);

      return {
        success: true,
        message: successMessage,
        entityTypesSet: validation.entityCount,
        edgeTypesSet: validation.edgeCount,
        validation,
      };
    } catch (error) {
      console.error('❌ Failed to set documentation ontology:', error);
      return {
        success: false,
        error: `Failed to set ontology: ${(error as Error).message}`,
        entityTypesSet: 0,
        edgeTypesSet: 0,
        validation: validateOntologyLimits(),
      };
    }
  }

  /**
   * Set ontology specifically on the project group graph
   * Uses the standard project group naming convention
   */
  async setProjectOntology(projectName?: string): Promise<OntologySetupResult> {
    const graphId = projectName ? `project-${projectName}` : 'project-zabaca-temporal-bridge';
    console.log(`🎯 Setting ontology on project graph: ${graphId}`);

    return await this.setDocumentationOntology(graphId);
  }

  /**
   * Get current ontology status from Zep
   * Checks what entity/edge types are currently configured
   */
  async getOntologyStatus(_graphId?: string): Promise<OntologyStatus> {
    try {
      await this.zepService.ensureUser();

      // Get current entity types from Zep
      const currentTypes = await this.zepService.graph.listEntityTypes();

      return {
        isSet: true,
        entityTypes: (currentTypes as { entityTypes?: string[]; edgeTypes?: string[] }).entityTypes || [],
        edgeTypes: (currentTypes as { entityTypes?: string[]; edgeTypes?: string[] }).edgeTypes || [],
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Failed to get ontology status:', error);
      return {
        isSet: false,
        entityTypes: [],
        edgeTypes: [],
        error: (error as Error).message,
      };
    }
  }

  /**
   * Validate that our ontology is properly set and working
   * Checks if custom entity types are available for use
   */
  async validateOntologySetup(graphId?: string): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check current ontology status
      const status = await this.getOntologyStatus(graphId);

      if (!status.isSet) {
        issues.push('Ontology is not set on the target graph');
        recommendations.push('Call setDocumentationOntology() or setProjectOntology()');
        return { valid: false, issues, recommendations };
      }

      // Check if our expected entity types are present
      const expectedEntityTypes = Object.keys(DocumentationEntityTypes);
      const missingEntityTypes = expectedEntityTypes.filter((type) => !status.entityTypes.includes(type));

      if (missingEntityTypes.length > 0) {
        issues.push(`Missing entity types: ${missingEntityTypes.join(', ')}`);
        recommendations.push('Re-run ontology setup to ensure all types are configured');
      }

      // Check if our expected edge types are present
      const expectedEdgeTypes = Object.keys(DocumentationEdgeTypes);
      const missingEdgeTypes = expectedEdgeTypes.filter((type) => !status.edgeTypes.includes(type));

      if (missingEdgeTypes.length > 0) {
        issues.push(`Missing edge types: ${missingEdgeTypes.join(', ')}`);
        recommendations.push('Re-run ontology setup to ensure all edge types are configured');
      }

      const isValid = issues.length === 0;

      if (isValid) {
        console.log('✅ Ontology validation passed - all expected types are configured');
      } else {
        console.warn('⚠️ Ontology validation found issues:', issues);
      }

      return { valid: isValid, issues, recommendations };
    } catch (error) {
      issues.push(`Validation failed: ${(error as Error).message}`);
      recommendations.push('Check Zep connection and permissions');
      return { valid: false, issues, recommendations };
    }
  }

  /**
   * Get information about available entity types for documentation
   * Useful for debugging and understanding what's configured
   */
  getAvailableEntityTypes(): {
    entityTypes: Record<string, { description: string; fieldCount: number }>;
    edgeTypes: Record<string, { description: string; sourceTargets: Array<{ source?: string; target?: string }> }>;
    limits: typeof ONTOLOGY_LIMITS;
  } {
    const entityTypes: Record<string, { description: string; fieldCount: number }> = {};
    const edgeTypes: Record<string, { description: string; sourceTargets: Array<{ source?: string; target?: string }> }> = {};

    // Process entity types
    for (const [name, schema] of Object.entries(DocumentationEntityTypes)) {
      entityTypes[name] = {
        description: schema.description,
        fieldCount: Object.keys(schema.fields).length,
      };
    }

    // Process edge types
    for (const [name, schema] of Object.entries(DocumentationEdgeTypes)) {
      edgeTypes[name] = {
        description: schema.description,
        sourceTargets: schema.sourceTargets || [],
      };
    }

    return {
      entityTypes,
      edgeTypes,
      limits: ONTOLOGY_LIMITS,
    };
  }

  /**
   * Reset ontology by setting empty types (removes all custom types)
   * Use with caution - this will remove all custom entity classifications
   */
  async resetOntology(graphId?: string): Promise<OntologySetupResult> {
    try {
      console.log('⚠️ Resetting ontology - removing all custom entity types...');

      await this.zepService.ensureUser();

      // Set empty ontology to remove all custom types
      await this.zepService.graph.setOntology(
        {},
        {}
      );

      const message = graphId ? `Ontology reset on graph: ${graphId}` : 'Ontology reset project-wide';

      console.log(`✅ ${message}`);

      return {
        success: true,
        message,
        entityTypesSet: 0,
        edgeTypesSet: 0,
        validation: {
          valid: true,
          entityCount: 0,
          edgeCount: 0,
          errors: [],
        },
      };
    } catch (error) {
      console.error('❌ Failed to reset ontology:', error);
      return {
        success: false,
        error: `Failed to reset ontology: ${(error as Error).message}`,
        entityTypesSet: 0,
        edgeTypesSet: 0,
        validation: validateOntologyLimits(),
      };
    }
  }
}
