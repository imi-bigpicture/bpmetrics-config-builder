export interface Entity {
  id: string;
  name: string;
  description?: string;
  attributes: Attribute[];
}

export interface Attribute {
  id: string;
  name: string; // Machine-readable field name
  displayName?: string; // Human-readable name from <Name> tag (optional for backwards compatibility)
  type: string;
  required: boolean; // XSD-based requirement (minOccurs >= 1 or use="required")
  naStatus?: string; // NA status from MSMDAD (e.g., "not allowed", "allowed")
  xpath: string;
  xmlFile?: string;
  msmdadId?: string;
  description?: string;
  entityId: string;
  isReference?: boolean; // True if this is a ReferenceType attribute
  referencesEntity?: string; // Entity ID this reference points to
}

export interface Selection {
  id: string;
  entity: string;
  attribute: string;
  xmlFile?: string;
  xpath: string;
  msmdadId?: string;
  metricKey: string;
}

// Metric operator types for semantic intent
export type MetricOperator = 
  | "DISTRIBUTION"    // Count source per target (default)
  | "COVERAGE"        // % of targets that have source
  | "EXISTS"          // Targets that have at least one source
  | "DISTINCT_COUNT"; // Unique source values per target

// Compound metric path for multi-entity traversal
export interface CompoundMetricPath {
  id: string;
  steps: PathStep[];
  targetAttribute?: Attribute;
  xpath: string;
  metricKey: string;
  
  // Semantic fields for "Question-First" design
  op: MetricOperator;
  source: string;           // Entity being counted/measured
  target: string;           // Entity being grouped by
  description: string;      // Human-readable question
  path: string[];           // Entity IDs in order (for readability)
  
  // For DISTRIBUTION: optional — without it the metric counts by alias (entity count).
  // For DISTINCT_COUNT: always required — defines which attribute value to count distinct on.
  // The entityId must be an entity present in the path; attribute must be one that
  // bpmetrics knows how to resolve (e.g. species/sex/control_terminology on
  // biological_being_entity, anatomical_site on specimen_entity, etc.).
  groupBy?: {
    entityId: string;   // which entity in the path to read from
    attribute: string;  // which attribute of that entity to group/count by
  };
  
  // Optional: Filter conditions to scope the metric
  filters?: MetricFilter[];
}

export interface MetricFilter {
  entity: string;           // Entity to filter on (must be in the path)
  attribute: string;        // Attribute name to filter (machine-readable)
  attributeDisplay?: string; // Human-readable attribute name
  operator: "equals" | "in" | "not_equals";
  value: string | string[];
}

export interface PathStep {
  fromEntity: string;
  fromEntityId: string;
  refAttribute: string;
  toEntity: string;
  toEntityId: string;
  isReverse?: boolean; // true if traversing edge backwards
}

export interface ConfigOutput {
  version: number;
  generated_at: string;
  source_schema_repo: string;
  selections: Selection[];
  compoundMetrics?: CompoundMetricPath[];
}
