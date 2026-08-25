import { Entity, PathStep } from "@/types/schema";

// Reference definition for graph traversal
export interface EntityReference {
  from: string;
  to: string;
  refName: string;
  description: string;
  isChoice?: boolean;
}

// Digital pathology themed colors
export const ENTITY_COLORS: Record<string, string> = {
  biological_being_entity: "hsl(25, 65%, 55%)",
  case_entity: "hsl(205, 70%, 50%)",
  specimen_entity: "hsl(340, 65%, 55%)",
  block_entity: "hsl(45, 75%, 50%)",
  slide_entity: "hsl(195, 70%, 55%)",
  staining_entity: "hsl(280, 60%, 55%)",
  image_entity: "hsl(145, 60%, 45%)",
  annotation_entity: "hsl(25, 80%, 55%)",
  observation_entity: "hsl(175, 60%, 45%)",
  observer_entity: "hsl(220, 60%, 55%)",
  dataset_entity: "hsl(160, 55%, 45%)",
  organisation_entity: "hsl(215, 45%, 50%)",
  rems_entity: "hsl(0, 60%, 50%)",
  policy_entity: "hsl(35, 50%, 45%)",
  landing_page_entity: "hsl(270, 55%, 55%)",
};

// References based on RefGraph struct - from MSMDAD XML reference attributes
export const XSD_REFERENCES: EntityReference[] = [
  // Core tissue/sample hierarchy
  { from: "case_entity", to: "biological_being_entity", refName: "BIOLOGICAL_BEING_REF", description: "Case references biological being" },
  { from: "specimen_entity", to: "biological_being_entity", refName: "EXTRACTED_FROM", description: "Specimen extracted from biological being" },
  { from: "specimen_entity", to: "case_entity", refName: "PART_OF_CASE", description: "Specimen part of case" },
  { from: "block_entity", to: "specimen_entity", refName: "SAMPLED_FROM", description: "Block sampled from specimen" },
  { from: "slide_entity", to: "block_entity", refName: "CREATED_FROM", description: "Slide created from block" },
  { from: "slide_entity", to: "staining_entity", refName: "STAINING_INFORMATION", description: "Slide has staining information" },
  
  // Imaging references
  { from: "image_entity", to: "slide_entity", refName: "IMAGE_OF", description: "Image of slide" },
  { from: "annotation_entity", to: "image_entity", refName: "IMAGE_REF", description: "Annotation references image" },
  
  // Observation references
  { from: "observation_entity", to: "observer_entity", refName: "OBSERVER_REF", description: "Observation made by observer" },
  { from: "observation_entity", to: "annotation_entity", refName: "OBSERVED_ON", description: "Observation on annotation", isChoice: true },
  { from: "observation_entity", to: "case_entity", refName: "OBSERVED_ON", description: "Observation on case", isChoice: true },
  { from: "observation_entity", to: "biological_being_entity", refName: "OBSERVED_ON", description: "Observation on biological being", isChoice: true },
  { from: "observation_entity", to: "specimen_entity", refName: "OBSERVED_ON", description: "Observation on specimen", isChoice: true },
  { from: "observation_entity", to: "block_entity", refName: "OBSERVED_ON", description: "Observation on block", isChoice: true },
  { from: "observation_entity", to: "slide_entity", refName: "OBSERVED_ON", description: "Observation on slide", isChoice: true },
  { from: "observation_entity", to: "image_entity", refName: "OBSERVED_ON", description: "Observation on image", isChoice: true },
  
  // Dataset references
  { from: "dataset_entity", to: "dataset_entity", refName: "complements_datasets", description: "Dataset complements other datasets" },
  { from: "dataset_entity", to: "image_entity", refName: "IMAGE_REF", description: "Dataset references images" },
  { from: "dataset_entity", to: "observation_entity", refName: "OBSERVATION_REF", description: "Dataset references observations" },
  { from: "dataset_entity", to: "annotation_entity", refName: "ANNOTATION_REF", description: "Dataset references annotations" },
  
  // External entity references to dataset
  { from: "landing_page_entity", to: "dataset_entity", refName: "DATASET_REF", description: "Landing page references dataset" },
  { from: "rems_entity", to: "dataset_entity", refName: "DATASET_REF", description: "REMS references dataset" },
  { from: "organisation_entity", to: "dataset_entity", refName: "DATASET_REF", description: "Organisation references dataset" },
  { from: "policy_entity", to: "dataset_entity", refName: "DATASET_REF", description: "Policy references dataset" },
];

// Entity ID to display name mapping
export const ENTITY_DISPLAY_NAMES: Record<string, string> = {
  biological_being_entity: "Biological Being",
  case_entity: "Case",
  specimen_entity: "Specimen",
  block_entity: "Block",
  slide_entity: "Slide",
  staining_entity: "Staining",
  image_entity: "Image",
  annotation_entity: "Annotation",
  observation_entity: "Observation",
  observer_entity: "Observer",
  dataset_entity: "Dataset",
  organisation_entity: "Organisation",
  rems_entity: "REMS",
  policy_entity: "Policy",
  landing_page_entity: "Landing Page",
};

/**
 * Get entities that have at least one outgoing reference
 */
export function getEntitiesWithReferences(entities: Entity[]): string[] {
  const entityIds = new Set(entities.map(e => e.id));
  const sourceEntities = new Set<string>();
  
  XSD_REFERENCES.forEach(ref => {
    if (entityIds.has(ref.from) && entityIds.has(ref.to)) {
      sourceEntities.add(ref.from);
    }
  });
  
  return Array.from(sourceEntities);
}

/**
 * Get direct connections from a source entity
 */
export function getDirectConnections(
  sourceEntityId: string,
  entities: Entity[]
): EntityReference[] {
  const entityIds = new Set(entities.map(e => e.id));
  
  return XSD_REFERENCES.filter(ref => 
    ref.from === sourceEntityId && 
    entityIds.has(ref.to)
  );
}

/**
 * Get all reachable entities from a source, organized by depth level
 */
export function getReachableEntities(
  sourceEntityId: string,
  entities: Entity[],
  maxDepth: number = 5
): Map<number, EntityReference[]> {
  const entityIds = new Set(entities.map(e => e.id));
  const result = new Map<number, EntityReference[]>();
  const visited = new Set<string>();
  visited.add(sourceEntityId);
  
  let currentLevel = [sourceEntityId];
  
  for (let depth = 1; depth <= maxDepth; depth++) {
    const levelRefs: EntityReference[] = [];
    const nextLevel: string[] = [];
    
    for (const entityId of currentLevel) {
      const connections = XSD_REFERENCES.filter(ref => 
        ref.from === entityId && 
        entityIds.has(ref.to) &&
        !visited.has(ref.to)
      );
      
      for (const conn of connections) {
        levelRefs.push(conn);
        if (!visited.has(conn.to)) {
          visited.add(conn.to);
          nextLevel.push(conn.to);
        }
      }
    }
    
    if (levelRefs.length > 0) {
      result.set(depth, levelRefs);
    }
    
    currentLevel = nextLevel;
    if (currentLevel.length === 0) break;
  }
  
  return result;
}

/**
 * Build a path from source to target entity
 */
export function buildPathToEntity(
  sourceEntityId: string,
  targetEntityId: string,
  entities: Entity[],
  maxDepth: number = 5
): PathStep[] | null {
  const entityIds = new Set(entities.map(e => e.id));
  
  // BFS to find shortest path
  const queue: { entityId: string; path: PathStep[] }[] = [
    { entityId: sourceEntityId, path: [] }
  ];
  const visited = new Set<string>();
  visited.add(sourceEntityId);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.path.length >= maxDepth) continue;
    
    const connections = XSD_REFERENCES.filter(ref => 
      ref.from === current.entityId && 
      entityIds.has(ref.to)
    );
    
    for (const conn of connections) {
      const newStep: PathStep = {
        fromEntity: ENTITY_DISPLAY_NAMES[conn.from] || conn.from,
        fromEntityId: conn.from,
        refAttribute: conn.refName,
        toEntity: ENTITY_DISPLAY_NAMES[conn.to] || conn.to,
        toEntityId: conn.to,
      };
      
      const newPath = [...current.path, newStep];
      
      if (conn.to === targetEntityId) {
        return newPath;
      }
      
      if (!visited.has(conn.to)) {
        visited.add(conn.to);
        queue.push({ entityId: conn.to, path: newPath });
      }
    }
  }
  
  return null;
}

/**
 * Generate compound XPath from a path
 */
export function generateCompoundXPath(steps: PathStep[]): string {
  if (steps.length === 0) return "";
  
  const parts: string[] = [];
  steps.forEach((step, i) => {
    const entityElement = step.fromEntityId.replace(/_entity$/, '').toUpperCase();
    const arrow = step.isReverse ? ' <- ' : ' -> ';
    if (i === 0) {
      parts.push(`/${entityElement}/${step.refAttribute}`);
    } else {
      parts.push(`${arrow}/${entityElement}/${step.refAttribute}`);
    }
  });
  
  return parts.join('');
}

/**
 * Generate a metric key from a path
 */
export function generateCompoundMetricKey(steps: PathStep[]): string {
  if (steps.length === 0) return "";
  
  const parts = [steps[0].fromEntityId.replace(/_entity$/, '')];
  steps.forEach(step => {
    parts.push(step.refAttribute.toLowerCase());
    parts.push(step.toEntityId.replace(/_entity$/, ''));
  });
  
  return parts.join('_');
}

/**
 * Get all entities reachable from a source with their full paths
 */
export interface ReachableEntity {
  entityId: string;
  entityName: string;
  depth: number;
  path: PathStep[];
  color: string;
  viaRef: string;
  isChoice?: boolean;
  isReverse?: boolean;
}

export function getAllReachableWithPaths(
  sourceEntityId: string,
  entities: Entity[],
  maxDepth: number = 5
): ReachableEntity[] {
  const entityIds = new Set(entities.map(e => e.id));
  const result: ReachableEntity[] = [];
  
  // BFS to find all reachable entities with paths
  const queue: { entityId: string; path: PathStep[]; depth: number }[] = [
    { entityId: sourceEntityId, path: [], depth: 0 }
  ];
  const visited = new Set<string>();
  visited.add(sourceEntityId);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.depth >= maxDepth) continue;
    
    const connections = XSD_REFERENCES.filter(ref => 
      ref.from === current.entityId && 
      entityIds.has(ref.to)
    );
    
    for (const conn of connections) {
      const newStep: PathStep = {
        fromEntity: ENTITY_DISPLAY_NAMES[conn.from] || conn.from,
        fromEntityId: conn.from,
        refAttribute: conn.refName,
        toEntity: ENTITY_DISPLAY_NAMES[conn.to] || conn.to,
        toEntityId: conn.to,
      };
      
      const newPath = [...current.path, newStep];
      const newDepth = current.depth + 1;
      
      // Always add to results (even if visited, for different paths)
      result.push({
        entityId: conn.to,
        entityName: ENTITY_DISPLAY_NAMES[conn.to] || conn.to,
        depth: newDepth,
        path: newPath,
        color: ENTITY_COLORS[conn.to] || "hsl(0, 0%, 50%)",
        viaRef: conn.refName,
        isChoice: conn.isChoice,
      });
      
      if (!visited.has(conn.to)) {
        visited.add(conn.to);
        queue.push({ entityId: conn.to, path: newPath, depth: newDepth });
      }
    }
  }
  
  return result;
}

/**
 * Build a path from source to target entity using BIDIRECTIONAL traversal
 * Can traverse both forward and reverse edges
 */
export function buildPathToEntityBidirectional(
  sourceEntityId: string,
  targetEntityId: string,
  entities: Entity[],
  maxDepth: number = 5
): PathStep[] | null {
  const entityIds = new Set(entities.map(e => e.id));
  
  // BFS to find shortest path using bidirectional edges
  const queue: { entityId: string; path: PathStep[] }[] = [
    { entityId: sourceEntityId, path: [] }
  ];
  const visited = new Set<string>();
  visited.add(sourceEntityId);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.path.length >= maxDepth) continue;
    
    // Forward edges: current → neighbor
    const forwardConnections = XSD_REFERENCES.filter(ref => 
      ref.from === current.entityId && 
      entityIds.has(ref.to)
    ).map(ref => ({
      neighborId: ref.to,
      refName: ref.refName,
      isReverse: false,
    }));
    
    // Reverse edges: neighbor → current (traverse backwards)
    const reverseConnections = XSD_REFERENCES.filter(ref => 
      ref.to === current.entityId && 
      entityIds.has(ref.from)
    ).map(ref => ({
      neighborId: ref.from,
      refName: ref.refName,
      isReverse: true,
    }));
    
    const allConnections = [...forwardConnections, ...reverseConnections];
    
    for (const conn of allConnections) {
      // Skip if this would return to the source (unless it's the target)
      if (conn.neighborId === sourceEntityId && targetEntityId !== sourceEntityId) {
        continue;
      }
      
      const newStep: PathStep = {
        fromEntity: ENTITY_DISPLAY_NAMES[current.entityId] || current.entityId,
        fromEntityId: current.entityId,
        refAttribute: conn.refName,
        toEntity: ENTITY_DISPLAY_NAMES[conn.neighborId] || conn.neighborId,
        toEntityId: conn.neighborId,
        isReverse: conn.isReverse,
      };
      
      const newPath = [...current.path, newStep];
      
      if (conn.neighborId === targetEntityId) {
        return newPath;
      }
      
      if (!visited.has(conn.neighborId)) {
        visited.add(conn.neighborId);
        queue.push({ entityId: conn.neighborId, path: newPath });
      }
    }
  }
  
  return null;
}

/**
 * Get all entities reachable from a source with their full paths using BIDIRECTIONAL traversal
 */
export function getAllReachableBidirectional(
  sourceEntityId: string,
  entities: Entity[],
  maxDepth: number = 5
): ReachableEntity[] {
  const entityIds = new Set(entities.map(e => e.id));
  const result: ReachableEntity[] = [];
  
  // BFS to find all reachable entities with paths
  const queue: { entityId: string; path: PathStep[]; depth: number }[] = [
    { entityId: sourceEntityId, path: [], depth: 0 }
  ];
  const visited = new Set<string>();
  visited.add(sourceEntityId);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.depth >= maxDepth) continue;
    
    // Forward edges: current → neighbor
    const forwardConnections = XSD_REFERENCES.filter(ref => 
      ref.from === current.entityId && 
      entityIds.has(ref.to)
    ).map(ref => ({
      neighborId: ref.to,
      refName: ref.refName,
      isReverse: false,
      isChoice: ref.isChoice,
    }));
    
    // Reverse edges: neighbor → current (traverse backwards)
    const reverseConnections = XSD_REFERENCES.filter(ref => 
      ref.to === current.entityId && 
      entityIds.has(ref.from)
    ).map(ref => ({
      neighborId: ref.from,
      refName: ref.refName,
      isReverse: true,
      isChoice: ref.isChoice,
    }));
    
    const allConnections = [...forwardConnections, ...reverseConnections];
    
    for (const conn of allConnections) {
      // Skip if this would return to the source entity (circular path)
      if (conn.neighborId === sourceEntityId) {
        continue;
      }
      
      const newStep: PathStep = {
        fromEntity: ENTITY_DISPLAY_NAMES[current.entityId] || current.entityId,
        fromEntityId: current.entityId,
        refAttribute: conn.refName,
        toEntity: ENTITY_DISPLAY_NAMES[conn.neighborId] || conn.neighborId,
        toEntityId: conn.neighborId,
        isReverse: conn.isReverse,
      };
      
      const newPath = [...current.path, newStep];
      const newDepth = current.depth + 1;
      
      // Always add to results (even if visited, for different paths)
      result.push({
        entityId: conn.neighborId,
        entityName: ENTITY_DISPLAY_NAMES[conn.neighborId] || conn.neighborId,
        depth: newDepth,
        path: newPath,
        color: ENTITY_COLORS[conn.neighborId] || "hsl(0, 0%, 50%)",
        viaRef: conn.refName,
        isChoice: conn.isChoice,
        isReverse: conn.isReverse,
      });
      
      if (!visited.has(conn.neighborId)) {
        visited.add(conn.neighborId);
        queue.push({ entityId: conn.neighborId, path: newPath, depth: newDepth });
      }
    }
  }
  
  return result;
}
