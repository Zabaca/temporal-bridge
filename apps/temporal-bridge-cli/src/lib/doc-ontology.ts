/**
 * Documentation Knowledge Graph Ontology
 * 
 * Defines custom entity types and edge types for technical documentation
 * knowledge graph focused on Architecture Changes and Data Models.
 * 
 * MVP Scope: Architecture, DataModel, ADR entities with key relationships
 */

// Import actual Zep types and helpers
import { 
  entityFields, 
  EntityTypeSchema, 
  EdgeTypeSchema 
} from '@getzep/zep-cloud';
import type { z } from 'zod';

// Re-export for convenience - infer types from Zod schemas
export type EntityType = z.infer<typeof EntityTypeSchema>;
export type EdgeType = z.infer<typeof EdgeTypeSchema>;

// ===============================
// CUSTOM ENTITY TYPES
// ===============================

/**
 * Architecture entity represents architectural components, decisions, and design elements
 * Covers C4 model levels: System Context, Container, Component, Code
 */
export const ArchitectureSchema: EntityType = {
  description: "Architectural component, system design element, or infrastructure piece that forms part of the system's structure",
  fields: {
    component_type: entityFields.text("Type of architectural component: service, database, api, library, frontend, backend, infrastructure"),
    c4_layer: entityFields.text("C4 architecture layer: context, container, component, code"),
    technology_stack: entityFields.text("Primary technologies used: TypeScript, Node.js, React, PostgreSQL, Redis, etc"),
    deployment_model: entityFields.text("How it's deployed: docker, serverless, vm, kubernetes, cloud-service"),
    status: entityFields.text("Current status: active, deprecated, planned, experimental, legacy")
  }
};

/**
 * DataModel entity represents data structures, schemas, and information models
 * Includes database schemas, TypeScript interfaces, API contracts
 */
export const DataModelSchema: EntityType = {
  description: "Data structure, schema definition, or information model that defines how data is organized and accessed",
  fields: {
    model_type: entityFields.text("Type of data model: entity, aggregate, dto, event, schema, interface"),
    storage_layer: entityFields.text("Where data is stored: postgres, redis, zep, memory, file, api"),
    schema_format: entityFields.text("Schema definition format: typescript, json-schema, sql, graphql, protobuf"),
    version: entityFields.text("Schema version or last major change date"),
    validation_rules: entityFields.text("Key validation constraints or business rules applied")
  }
};

/**
 * ArchitectureDecision entity represents Architecture Decision Records (ADRs)
 * Tracks architectural decisions with context, consequences, and status over time
 */
export const ArchitectureDecisionSchema: EntityType = {
  description: "Architecture Decision Record (ADR) documenting a significant architectural choice, its context, and consequences",
  fields: {
    decision_title: entityFields.text("Brief title describing what was decided"),
    status: entityFields.text("ADR status: proposed, accepted, deprecated, superseded"),
    decision_date: entityFields.text("Date when decision was made or proposed"),
    impact_scope: entityFields.text("Areas affected: system-wide, service-specific, data-layer, ui-layer, integration"),
    alternatives_considered: entityFields.text("Other options that were evaluated before making this decision")
  }
};

// ===============================
// CUSTOM EDGE TYPES  
// ===============================

/**
 * Documents relationship: Component/System is documented by Documentation
 * Links architectural components to their documentation
 */
export const DocumentsSchema: EdgeType = {
  description: "Architectural component or data model is documented by technical documentation",
  fields: {},
  sourceTargets: [
    { source: "Architecture", target: "Documentation" },
    { source: "DataModel", target: "Documentation" }
  ]
};

/**
 * Implements relationship: Architecture implements ADR or Requirement
 * Tracks which components implement architectural decisions
 */
export const ImplementsSchema: EdgeType = {
  description: "Architectural component implements an architecture decision or requirement",
  fields: {},
  sourceTargets: [
    { source: "Architecture", target: "ArchitectureDecision" },
    { source: "Architecture", target: "Requirement" }
  ]
};

/**
 * Supersedes relationship: New version supersedes old version
 * Tracks evolution and replacement of documentation, decisions, or components
 */
export const SupersedesSchema: EdgeType = {
  description: "Newer documentation, decision, or component supersedes an older version",
  fields: {},
  sourceTargets: [
    { source: "Architecture", target: "Architecture" },
    { source: "DataModel", target: "DataModel" },
    { source: "ArchitectureDecision", target: "ArchitectureDecision" }
  ]
};

/**
 * DependsOn relationship: Component depends on another component
 * Models architectural dependencies between services, libraries, or systems
 */
export const DependsOnSchema: EdgeType = {
  description: "Architectural component has a dependency on another component",
  fields: {},
  sourceTargets: [
    { source: "Architecture", target: "Architecture" }
  ]
};

/**
 * UsesDataModel relationship: Architecture uses specific data models
 * Links components to the data structures they work with
 */
export const UsesDataModelSchema: EdgeType = {
  description: "Architectural component uses or manipulates a specific data model",
  fields: {},
  sourceTargets: [
    { source: "Architecture", target: "DataModel" }
  ]
};

/**
 * AffectedBy relationship: Component or model affected by architectural decision
 * Tracks the impact scope of ADRs on system components
 */
export const AffectedBySchema: EdgeType = {
  description: "Component or data model is affected by an architectural decision",
  fields: {},
  sourceTargets: [
    { source: "Architecture", target: "ArchitectureDecision" },
    { source: "DataModel", target: "ArchitectureDecision" }
  ]
};

// ===============================
// ONTOLOGY COLLECTION
// ===============================

/**
 * Complete entity type definitions for documentation knowledge graph
 * Limited to 3 entity types for MVP focus on Architecture & Data Models
 */
export const DocumentationEntityTypes = {
  Architecture: ArchitectureSchema,
  DataModel: DataModelSchema,
  ArchitectureDecision: ArchitectureDecisionSchema,
} as const;

/**
 * Complete edge type definitions for documentation relationships
 * 6 edge types covering key relationships between documentation entities
 */
export const DocumentationEdgeTypes = {
  Documents: DocumentsSchema,
  Implements: ImplementsSchema,
  Supersedes: SupersedesSchema,
  DependsOn: DependsOnSchema,
  UsesDataModel: UsesDataModelSchema,
  AffectedBy: AffectedBySchema,
} as const;

/**
 * Type definitions for working with the ontology
 */
export type DocumentationEntityType = keyof typeof DocumentationEntityTypes;
export type DocumentationEdgeType = keyof typeof DocumentationEdgeTypes;

/**
 * Validation constants based on Zep limits
 */
export const ONTOLOGY_LIMITS = {
  MAX_ENTITY_TYPES: 10,
  MAX_EDGE_TYPES: 10,
  MAX_FIELDS_PER_TYPE: 10,
  CURRENT_ENTITY_COUNT: Object.keys(DocumentationEntityTypes).length,
  CURRENT_EDGE_COUNT: Object.keys(DocumentationEdgeTypes).length,
} as const;

/**
 * Helper to validate ontology fits within Zep limits
 */
export function validateOntologyLimits(): {
  valid: boolean;
  entityCount: number;
  edgeCount: number;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (ONTOLOGY_LIMITS.CURRENT_ENTITY_COUNT > ONTOLOGY_LIMITS.MAX_ENTITY_TYPES) {
    errors.push(`Entity types (${ONTOLOGY_LIMITS.CURRENT_ENTITY_COUNT}) exceed limit (${ONTOLOGY_LIMITS.MAX_ENTITY_TYPES})`);
  }
  
  if (ONTOLOGY_LIMITS.CURRENT_EDGE_COUNT > ONTOLOGY_LIMITS.MAX_EDGE_TYPES) {
    errors.push(`Edge types (${ONTOLOGY_LIMITS.CURRENT_EDGE_COUNT}) exceed limit (${ONTOLOGY_LIMITS.MAX_EDGE_TYPES})`);
  }

  // Validate field counts for each entity type
  for (const [name, schema] of Object.entries(DocumentationEntityTypes)) {
    const fieldCount = Object.keys(schema.fields).length;
    if (fieldCount > ONTOLOGY_LIMITS.MAX_FIELDS_PER_TYPE) {
      errors.push(`${name} has ${fieldCount} fields, exceeding limit of ${ONTOLOGY_LIMITS.MAX_FIELDS_PER_TYPE}`);
    }
  }

  return {
    valid: errors.length === 0,
    entityCount: ONTOLOGY_LIMITS.CURRENT_ENTITY_COUNT,
    edgeCount: ONTOLOGY_LIMITS.CURRENT_EDGE_COUNT,
    errors,
  };
}