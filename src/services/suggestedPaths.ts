import { Entity, CompoundMetricPath, PathStep, MetricOperator } from "@/types/schema";
import { buildPathToEntityBidirectional, ENTITY_DISPLAY_NAMES, ENTITY_COLORS } from "./graphTraversal";

export interface SuggestedPath {
  id: string;
  sourceEntity: string;
  path: string[];
  questionExample: string;
  description: string;
  degree: number; // 1 = single grouping, 2 = double grouping, etc.
  op?: MetricOperator; // defaults to DISTRIBUTION
}

// Predefined suggested paths organized by source entity
// Framed from a technical/schema perspective, not domain expertise
export const SUGGESTED_PATHS: SuggestedPath[] = [
  // ============================================================
  // 1st DEGREE PATHS - Source grouped by 1 target
  // ============================================================
  
  // Image as source
  {
    id: "image_to_staining",
    sourceEntity: "image_entity",
    path: ["image_entity", "slide_entity", "staining_entity"],
    questionExample: "Number of images per staining type",
    description: "Resolves Slide → Staining references",
    degree: 1,
  },
  {
    id: "image_to_specimen",
    sourceEntity: "image_entity",
    path: ["image_entity", "slide_entity", "block_entity", "specimen_entity"],
    questionExample: "Number of images per specimen",
    description: "Follows Slide → Block → Specimen references",
    degree: 1,
  },
  {
    id: "image_to_case",
    sourceEntity: "image_entity",
    path: ["image_entity", "slide_entity", "block_entity", "specimen_entity", "case_entity"],
    questionExample: "Number of images per case",
    description: "Follows Slide → Block → Specimen → Case references",
    degree: 1,
  },
  {
    id: "image_to_biological_being",
    sourceEntity: "image_entity",
    path: ["image_entity", "slide_entity", "block_entity", "specimen_entity", "biological_being_entity"],
    questionExample: "Number of images per subject",
    description: "Follows Slide → Block → Specimen → Biological Being references",
    degree: 1,
  },

  // Observation as source
  {
    id: "observation_to_observer",
    sourceEntity: "observation_entity",
    path: ["observation_entity", "observer_entity"],
    questionExample: "Number of observations per observer",
    description: "Resolves Observer reference",
    degree: 1,
  },
  {
    id: "observation_to_image",
    sourceEntity: "observation_entity",
    path: ["observation_entity", "image_entity"],
    questionExample: "Number of observations per image",
    description: "Resolves Image reference",
    degree: 1,
  },
  {
    id: "observation_to_staining",
    sourceEntity: "observation_entity",
    path: ["observation_entity", "image_entity", "slide_entity", "staining_entity"],
    questionExample: "Number of observations per staining type",
    description: "Follows Image → Slide → Staining references",
    degree: 1,
  },
  {
    id: "observation_to_specimen",
    sourceEntity: "observation_entity",
    path: ["observation_entity", "specimen_entity"],
    questionExample: "Number of observations per specimen",
    description: "Resolves Specimen reference",
    degree: 1,
  },

  // Slide as source
  {
    id: "slide_to_staining",
    sourceEntity: "slide_entity",
    path: ["slide_entity", "staining_entity"],
    questionExample: "Number of slides per staining type",
    description: "Resolves Staining reference",
    degree: 1,
  },
  {
    id: "slide_to_specimen",
    sourceEntity: "slide_entity",
    path: ["slide_entity", "block_entity", "specimen_entity"],
    questionExample: "Number of slides per specimen",
    description: "Follows Block → Specimen references",
    degree: 1,
  },
  {
    id: "slide_to_case",
    sourceEntity: "slide_entity",
    path: ["slide_entity", "block_entity", "specimen_entity", "case_entity"],
    questionExample: "Number of slides per case",
    description: "Follows Block → Specimen → Case references",
    degree: 1,
  },

  // Dataset as source
  {
    id: "dataset_to_staining",
    sourceEntity: "dataset_entity",
    path: ["dataset_entity", "image_entity", "slide_entity", "staining_entity"],
    questionExample: "Number of images per staining type (in dataset)",
    description: "Follows Image → Slide → Staining references",
    degree: 1,
  },
  {
    id: "dataset_to_observer",
    sourceEntity: "dataset_entity",
    path: ["dataset_entity", "observation_entity", "observer_entity"],
    questionExample: "Number of observations per observer (in dataset)",
    description: "Follows Observation → Observer references",
    degree: 1,
  },
  {
    id: "dataset_to_specimen",
    sourceEntity: "dataset_entity",
    path: ["dataset_entity", "image_entity", "slide_entity", "block_entity", "specimen_entity"],
    questionExample: "Number of images per specimen (in dataset)",
    description: "Follows Image → Slide → Block → Specimen references",
    degree: 1,
  },

  // Specimen as source
  {
    id: "specimen_to_case",
    sourceEntity: "specimen_entity",
    path: ["specimen_entity", "case_entity"],
    questionExample: "Number of specimens per case",
    description: "Resolves Case reference",
    degree: 1,
  },
  {
    id: "specimen_to_biological_being",
    sourceEntity: "specimen_entity",
    path: ["specimen_entity", "biological_being_entity"],
    questionExample: "Number of specimens per subject",
    description: "Resolves Biological Being reference",
    degree: 1,
  },

  // Case as source
  {
    id: "case_to_biological_being",
    sourceEntity: "case_entity",
    path: ["case_entity", "biological_being_entity"],
    questionExample: "Number of cases per subject",
    description: "Resolves Biological Being reference",
    degree: 1,
  },

  // Block as source
  {
    id: "block_to_specimen",
    sourceEntity: "block_entity",
    path: ["block_entity", "specimen_entity"],
    questionExample: "Number of blocks per specimen",
    description: "Resolves Specimen reference",
    degree: 1,
  },
  {
    id: "block_to_case",
    sourceEntity: "block_entity",
    path: ["block_entity", "specimen_entity", "case_entity"],
    questionExample: "Number of blocks per case",
    description: "Follows Specimen → Case references",
    degree: 1,
  },

  // Annotation as source
  {
    id: "annotation_to_image",
    sourceEntity: "annotation_entity",
    path: ["annotation_entity", "image_entity"],
    questionExample: "Number of annotations per image",
    description: "Resolves Image reference",
    degree: 1,
  },
  {
    id: "annotation_to_staining",
    sourceEntity: "annotation_entity",
    path: ["annotation_entity", "image_entity", "slide_entity", "staining_entity"],
    questionExample: "Number of annotations per staining type",
    description: "Follows Image → Slide → Staining references",
    degree: 1,
  },

  // ============================================================
  // 2nd DEGREE PATHS - Source grouped by 2 targets
  // ============================================================

  // Image as source - 2nd degree
  {
    id: "image_to_staining_and_case",
    sourceEntity: "image_entity",
    path: ["image_entity", "slide_entity", "staining_entity", "block_entity", "specimen_entity", "case_entity"],
    questionExample: "Number of images per staining type per case",
    description: "Cross-reference: Staining type + Case",
    degree: 2,
  },
  {
    id: "image_to_staining_and_specimen",
    sourceEntity: "image_entity",
    path: ["image_entity", "slide_entity", "staining_entity", "block_entity", "specimen_entity"],
    questionExample: "Number of images per staining type per specimen",
    description: "Cross-reference: Staining type + Specimen",
    degree: 2,
  },
  {
    id: "image_to_staining_and_subject",
    sourceEntity: "image_entity",
    path: ["image_entity", "slide_entity", "staining_entity", "block_entity", "specimen_entity", "biological_being_entity"],
    questionExample: "Number of images per staining type per subject",
    description: "Cross-reference: Staining type + Biological Being",
    degree: 2,
  },

  // Observation as source - 2nd degree
  {
    id: "observation_to_observer_and_image",
    sourceEntity: "observation_entity",
    path: ["observation_entity", "observer_entity", "image_entity"],
    questionExample: "Number of observations per observer per image",
    description: "Cross-reference: Observer + Image",
    degree: 2,
  },
  {
    id: "observation_to_observer_and_specimen",
    sourceEntity: "observation_entity",
    path: ["observation_entity", "observer_entity", "specimen_entity"],
    questionExample: "Number of observations per observer per specimen",
    description: "Cross-reference: Observer + Specimen",
    degree: 2,
  },
  {
    id: "observation_to_image_and_staining",
    sourceEntity: "observation_entity",
    path: ["observation_entity", "image_entity", "slide_entity", "staining_entity"],
    questionExample: "Number of observations per image per staining type",
    description: "Cross-reference: Image + Staining type",
    degree: 2,
  },

  // Slide as source - 2nd degree
  {
    id: "slide_to_staining_and_specimen",
    sourceEntity: "slide_entity",
    path: ["slide_entity", "staining_entity", "block_entity", "specimen_entity"],
    questionExample: "Number of slides per staining type per specimen",
    description: "Cross-reference: Staining type + Specimen",
    degree: 2,
  },
  {
    id: "slide_to_staining_and_case",
    sourceEntity: "slide_entity",
    path: ["slide_entity", "staining_entity", "block_entity", "specimen_entity", "case_entity"],
    questionExample: "Number of slides per staining type per case",
    description: "Cross-reference: Staining type + Case",
    degree: 2,
  },

  // Annotation as source - 2nd degree
  {
    id: "annotation_to_image_and_specimen",
    sourceEntity: "annotation_entity",
    path: ["annotation_entity", "image_entity", "slide_entity", "block_entity", "specimen_entity"],
    questionExample: "Number of annotations per image per specimen",
    description: "Cross-reference: Image + Specimen",
    degree: 2,
  },
  {
    id: "annotation_to_staining_and_case",
    sourceEntity: "annotation_entity",
    path: ["annotation_entity", "image_entity", "slide_entity", "staining_entity", "block_entity", "specimen_entity", "case_entity"],
    questionExample: "Number of annotations per staining type per case",
    description: "Cross-reference: Staining type + Case",
    degree: 2,
  },

  // Block as source - 2nd degree
  {
    id: "block_to_specimen_and_subject",
    sourceEntity: "block_entity",
    path: ["block_entity", "specimen_entity", "biological_being_entity"],
    questionExample: "Number of blocks per specimen per subject",
    description: "Cross-reference: Specimen + Biological Being",
    degree: 2,
  },
];

/**
 * Get suggested paths for a specific source entity
 */
export function getSuggestedPathsForEntity(entityId: string): SuggestedPath[] {
  return SUGGESTED_PATHS.filter(p => p.sourceEntity === entityId);
}

/**
 * Get suggested paths for a specific source entity, grouped by degree
 */
export function getSuggestedPathsByDegree(entityId: string): Map<number, SuggestedPath[]> {
  const paths = getSuggestedPathsForEntity(entityId);
  const grouped = new Map<number, SuggestedPath[]>();
  
  paths.forEach(p => {
    const list = grouped.get(p.degree) || [];
    list.push(p);
    grouped.set(p.degree, list);
  });
  
  return grouped;
}

/**
 * Get degree label for display
 */
export function getDegreeLabel(degree: number): string {
  const labels: Record<number, string> = {
    1: "1st Degree (Single Grouping)",
    2: "2nd Degree (Cross-Reference)",
    3: "3rd Degree (Triple Grouping)",
  };
  return labels[degree] || `${degree}th Degree`;
}

/**
 * Convert a suggested path to a CompoundMetricPath using graph traversal
 * Returns null if the path cannot be built (missing entities or references)
 */
export function buildMetricFromSuggestion(
  suggestion: SuggestedPath,
  entities: Entity[]
): CompoundMetricPath | null {
  const pathEntities = suggestion.path;
  if (pathEntities.length < 2) return null;

  const allSteps: PathStep[] = [];
  
  // Build path step by step using BIDIRECTIONAL graph traversal logic
  for (let i = 0; i < pathEntities.length - 1; i++) {
    const fromId = pathEntities[i];
    const toId = pathEntities[i + 1];
    
    // Use bidirectional traversal to find path between consecutive entities
    const pathSegment = buildPathToEntityBidirectional(fromId, toId, entities, 2);
    
    if (!pathSegment || pathSegment.length === 0) {
      // Direct path not found, the schema doesn't support this connection
      return null;
    }
    
    allSteps.push(...pathSegment);
  }

  if (allSteps.length === 0) return null;

  // Generate xpath and metric key from the path
  const pathParts = allSteps.map(step => {
    const entityElement = step.fromEntityId.replace(/_entity$/, "").toUpperCase();
    return `/${entityElement}/${step.refAttribute}`;
  });
  const xpath = pathParts.join(" -> ");

  const keyParts = [allSteps[0].fromEntityId.replace(/_entity$/, "")];
  allSteps.forEach(step => {
    keyParts.push(step.refAttribute.toLowerCase());
    keyParts.push(step.toEntityId.replace(/_entity$/, ""));
  });
  const metricKey = keyParts.join("_");

  return {
    id: `suggested_${suggestion.id}_${Date.now()}`,
    steps: allSteps,
    xpath,
    metricKey,
    // Semantic fields for Question-First design
    op: suggestion.op || "DISTRIBUTION",
    source: suggestion.path[0],
    target: suggestion.path[suggestion.path.length - 1],
    description: suggestion.questionExample,
    path: suggestion.path,
  };
}

/**
 * Get display-friendly path visualization from entity IDs
 */
export function getPathDisplayNames(path: string[]): string[] {
  return path.map(id => ENTITY_DISPLAY_NAMES[id] || id);
}

/**
 * Get color for an entity
 */
export function getEntityColor(entityId: string): string {
  return ENTITY_COLORS[entityId] || "hsl(0, 0%, 50%)";
}
