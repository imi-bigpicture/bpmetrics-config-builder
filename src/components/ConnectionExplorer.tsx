import { useState, useMemo } from "react";
import { Entity, Attribute, CompoundMetricPath, PathStep, MetricFilter, MetricOperator } from "@/types/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  Link2,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Check,
  Wrench,
  Filter,
  Trash2,
} from "lucide-react";
import {
  getEntitiesWithReferences,
  getAllReachableWithPaths,
  getAllReachableBidirectional,
  generateCompoundXPath,
  generateCompoundMetricKey,
  ENTITY_COLORS,
  ENTITY_DISPLAY_NAMES,
  ReachableEntity,
} from "@/services/graphTraversal";
import {
  getSuggestedPathsByDegree,
  buildMetricFromSuggestion,
  getPathDisplayNames,
  getEntityColor,
  getDegreeLabel,
  SuggestedPath,
} from "@/services/suggestedPaths";

// The set of (entityId, attribute) pairs that bpmetrics currently has extractors for.
// Any attribute NOT in this table would need a new resolver added in bpmetrics first —
// so we constrain the UI to this known-good set rather than showing every XSD attribute.
const KNOWN_GROUP_BY_ATTRIBUTES: Record<string, { attribute: string; displayName: string }[]> = {
  biological_being_entity: [
    { attribute: "species",              displayName: "Species"              },
    { attribute: "sex",                  displayName: "Sex"                  },
    { attribute: "control_terminology",  displayName: "Control Terminology"  },
  ],
  specimen_entity: [
    { attribute: "anatomical_site",      displayName: "Anatomical Site"      },
  ],
  staining_entity: [
    { attribute: "stain_code",           displayName: "Stain Code"           },
  ],
  observation_entity: [
    { attribute: "diagnosis",            displayName: "Diagnosis"            },
  ],
};

interface ConnectionExplorerProps {
  entities: Entity[];
  onAddCompoundMetric: (metric: CompoundMetricPath) => void;
  selectedCompoundMetrics: CompoundMetricPath[];
}

export const ConnectionExplorer = ({
  entities,
  onAddCompoundMetric,
  selectedCompoundMetrics,
}: ConnectionExplorerProps) => {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLevels, setExpandedLevels] = useState<Map<string, Set<number>>>(new Map());
  const [selectedPath, setSelectedPath] = useState<ReachableEntity | null>(null);
  const [suggestedPathsOpen, setSuggestedPathsOpen] = useState<Map<string, boolean>>(new Map());
  const [explorerTab, setExplorerTab] = useState<"forward" | "builder">("forward");
  // Filter state per path (keyed by metric key)
  const [pathFilters, setPathFilters] = useState<Map<string, MetricFilter[]>>(new Map());
  const [filterDraft, setFilterDraft] = useState<{ entity: string; attribute: string; value: string } | null>(null);

  // Operator + groupBy state per path (keyed by metric key).
  // Defaults to DISTRIBUTION when absent; groupBy is only relevant for
  // DISTRIBUTION (optional) and DISTINCT_COUNT (required).
  const [pathOps, setPathOps] = useState<Map<string, MetricOperator>>(new Map());
  const [pathGroupBy, setPathGroupBy] = useState<Map<string, { entityId: string; attribute: string }>>(new Map());

  // Get expanded levels for current entity AND current tab (decoupled per tab)
  const currentExpandedLevels = useMemo(() => {
    if (!selectedSource) return new Set<number>();
    const key = `${selectedSource}:${explorerTab}`;
    return expandedLevels.get(key) || new Set<number>();
  }, [expandedLevels, selectedSource, explorerTab]);

  // Get suggested paths open state for current entity
  const currentSuggestedPathsOpen = useMemo(() => {
    if (!selectedSource) return false;
    return suggestedPathsOpen.get(selectedSource) || false;
  }, [suggestedPathsOpen, selectedSource]);

  // Get entities that have outgoing references
  const sourceEntities = useMemo(() => {
    return getEntitiesWithReferences(entities);
  }, [entities]);

  // Filter source entities by search
  const filteredSourceEntities = useMemo(() => {
    if (!searchQuery) return sourceEntities;
    const query = searchQuery.toLowerCase();
    return sourceEntities.filter(id => {
      const name = ENTITY_DISPLAY_NAMES[id] || id;
      return name.toLowerCase().includes(query);
    });
  }, [sourceEntities, searchQuery]);

  // Get reachable entities from selected source (forward only)
  const reachableEntities = useMemo(() => {
    if (!selectedSource) return [];
    return getAllReachableWithPaths(selectedSource, entities, 5);
  }, [selectedSource, entities]);

  // Get bidirectional reachable entities from selected source
  const bidirectionalReachable = useMemo(() => {
    if (!selectedSource) return [];
    return getAllReachableBidirectional(selectedSource, entities, 5);
  }, [selectedSource, entities]);

  // Group by depth level (for forward tab)
  const reachableByLevel = useMemo(() => {
    const grouped = new Map<number, ReachableEntity[]>();
    reachableEntities.forEach(entity => {
      const level = grouped.get(entity.depth) || [];
      level.push(entity);
      grouped.set(entity.depth, level);
    });
    return grouped;
  }, [reachableEntities]);

  // Group by depth level (for bidirectional/builder tab)
  const bidirectionalByLevel = useMemo(() => {
    const grouped = new Map<number, ReachableEntity[]>();
    bidirectionalReachable.forEach(entity => {
      const level = grouped.get(entity.depth) || [];
      level.push(entity);
      grouped.set(entity.depth, level);
    });
    return grouped;
  }, [bidirectionalReachable]);

  // Get suggested paths for selected source, grouped by degree
  const suggestedPathsByDegree = useMemo(() => {
    if (!selectedSource) return new Map<number, SuggestedPath[]>();
    return getSuggestedPathsByDegree(selectedSource);
  }, [selectedSource]);

  // Calculate total suggested paths count
  const totalSuggestedPaths = useMemo(() => {
    let count = 0;
    suggestedPathsByDegree.forEach(paths => count += paths.length);
    return count;
  }, [suggestedPathsByDegree]);

  const toggleLevel = (level: number) => {
    if (!selectedSource) return;
    const key = `${selectedSource}:${explorerTab}`;
    const newExpanded = new Map(expandedLevels);
    const entityLevels = new Set(newExpanded.get(key) || []);
    if (entityLevels.has(level)) {
      entityLevels.delete(level);
    } else {
      entityLevels.add(level);
    }
    newExpanded.set(key, entityLevels);
    setExpandedLevels(newExpanded);
  };

  const toggleSuggestedPaths = (open: boolean) => {
    if (!selectedSource) return;
    const newMap = new Map(suggestedPathsOpen);
    newMap.set(selectedSource, open);
    setSuggestedPathsOpen(newMap);
  };

  // Get all entity IDs along a path (for filter entity selection)
  const getEntitiesInPath = (reachable: ReachableEntity): string[] => {
    const ids: string[] = [reachable.path[0]?.fromEntityId || selectedSource!];
    reachable.path.forEach(step => {
      if (!ids.includes(step.toEntityId)) ids.push(step.toEntityId);
    });
    return ids;
  };

  // Get attributes for an entity by ID
  const getEntityAttributes = (entityId: string): Attribute[] => {
    const entity = entities.find(e => e.id === entityId);
    return entity?.attributes || [];
  };

  const addFilterToPath = (metricKey: string, filter: MetricFilter) => {
    const newFilters = new Map(pathFilters);
    const existing = newFilters.get(metricKey) || [];
    newFilters.set(metricKey, [...existing, filter]);
    setPathFilters(newFilters);
  };

  const removeFilterFromPath = (metricKey: string, index: number) => {
    const newFilters = new Map(pathFilters);
    const existing = [...(newFilters.get(metricKey) || [])];
    existing.splice(index, 1);
    newFilters.set(metricKey, existing);
    setPathFilters(newFilters);
  };

  const handleAddPath = (reachable: ReachableEntity) => {
    const metricId = `compound_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sourceName = ENTITY_DISPLAY_NAMES[selectedSource!] || selectedSource!;
    const targetName = ENTITY_DISPLAY_NAMES[reachable.entityId] || reachable.entityId;
    
    // Build path array from steps
    const pathArray = [reachable.path[0]?.fromEntityId || selectedSource!];
    reachable.path.forEach(step => pathArray.push(step.toEntityId));

    const metricKey = generateCompoundMetricKey(reachable.path);
    const filters = pathFilters.get(metricKey) || [];
    // Read op + groupBy from per-path state; fall back to sensible defaults
    const op = pathOps.get(metricKey) ?? "DISTRIBUTION";
    const groupBy = pathGroupBy.get(metricKey);

    const metric: CompoundMetricPath = {
      id: metricId,
      steps: reachable.path,
      xpath: generateCompoundXPath(reachable.path),
      metricKey,
      op,
      source: selectedSource!,
      target: reachable.entityId,
      description: `Number of ${sourceName} per ${targetName}`,
      path: pathArray,
      filters: filters.length > 0 ? filters : undefined,
      // Only include groupBy when both fields are filled in
      groupBy: groupBy?.entityId && groupBy?.attribute ? groupBy : undefined,
    };
    onAddCompoundMetric(metric);
  };

  const handleAddSuggestedPath = (suggestion: SuggestedPath) => {
    const metric = buildMetricFromSuggestion(suggestion, entities);
    if (metric) {
      onAddCompoundMetric(metric);
    }
  };

  const isPathSelected = (reachable: ReachableEntity): boolean => {
    const pathKey = generateCompoundMetricKey(reachable.path);
    return selectedCompoundMetrics.some(m => m.metricKey === pathKey);
  };

  const isSuggestedPathSelected = (suggestion: SuggestedPath): boolean => {
    // Build the metric key from the suggestion path to check if already added
    const metric = buildMetricFromSuggestion(suggestion, entities);
    if (!metric) return false;
    return selectedCompoundMetrics.some(m => m.metricKey === metric.metricKey);
  };

  const renderPathVisualization = (steps: PathStep[]) => {
    if (steps.length === 0) return null;

    return (
      <div className="flex items-center gap-1 flex-wrap">
        <Badge
          variant="outline"
          className="text-xs"
          style={{
            borderColor: ENTITY_COLORS[steps[0].fromEntityId],
            color: ENTITY_COLORS[steps[0].fromEntityId],
          }}
        >
          {steps[0].fromEntity}
        </Badge>
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-1">
            {step.isReverse ? (
              <ArrowLeft className="w-3 h-3 text-amber-500" />
            ) : (
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
            )}
            <code className={`text-[10px] px-1 rounded ${step.isReverse ? 'bg-amber-500/10' : 'bg-muted'}`}>
              {step.refAttribute}
            </code>
            {step.isReverse ? (
              <ArrowLeft className="w-3 h-3 text-amber-500" />
            ) : (
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
            )}
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                borderColor: ENTITY_COLORS[step.toEntityId],
                color: ENTITY_COLORS[step.toEntityId],
              }}
            >
              {step.toEntity}
            </Badge>
          </div>
        ))}
      </div>
    );
  };

  const renderSuggestedPathCard = (suggestion: SuggestedPath) => {
    const displayNames = getPathDisplayNames(suggestion.path);
    const isAdded = isSuggestedPathSelected(suggestion);

    return (
      <div
        key={suggestion.id}
        className={`border rounded-lg p-3 transition-colors ${
          isAdded ? "bg-muted/50 border-primary/30" : "border-border hover:border-primary/20"
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1 flex-wrap">
            {displayNames.map((name, idx) => (
              <div key={idx} className="flex items-center gap-1">
                {idx > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{
                    borderColor: getEntityColor(suggestion.path[idx]),
                    color: getEntityColor(suggestion.path[idx]),
                  }}
                >
                  {name}
                </Badge>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant={isAdded ? "secondary" : "default"}
            className="shrink-0 h-7 px-2 gap-1"
            disabled={isAdded}
            onClick={() => handleAddSuggestedPath(suggestion)}
          >
            {isAdded ? (
              <>
                <Check className="w-3 h-3" />
                Added
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                Add
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground italic">
          "{suggestion.questionExample}"
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {suggestion.description}
        </p>
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col bg-background">
      <div className="p-4 border-b bg-muted/30">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Connection Explorer
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Discover multi-level entity connections for compound metrics
        </p>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Source Entities */}
        <div className="w-64 border-r flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search entities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredSourceEntities.map(entityId => {
                const displayName = ENTITY_DISPLAY_NAMES[entityId] || entityId;
                const color = ENTITY_COLORS[entityId];
                const isSelected = selectedSource === entityId;
                const connectionCount = getEntitiesWithReferences(entities).length;

                return (
                  <button
                    key={entityId}
                    onClick={() => {
                      setSelectedSource(entityId);
                      setSelectedPath(null);
                    }}
                    className={`w-full text-left p-2.5 rounded-md transition-colors ${
                      isSelected
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-medium text-sm">{displayName}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {getAllReachableWithPaths(entityId, entities, 5).length}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Connection Paths */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedSource ? (
            <>
              <div className="p-3 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                  <Badge
                    style={{
                      backgroundColor: ENTITY_COLORS[selectedSource],
                      color: "white",
                    }}
                  >
                    {ENTITY_DISPLAY_NAMES[selectedSource]}
                  </Badge>
                </div>
              </div>

              <Tabs value={explorerTab} onValueChange={(v) => setExplorerTab(v as "forward" | "builder")} className="flex-1 flex flex-col min-h-0">
                <div className="px-3 pt-3">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="forward" className="gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5" />
                      Forward Connections
                    </TabsTrigger>
                    <TabsTrigger value="builder" className="gap-1.5">
                      <Wrench className="w-3.5 h-3.5" />
                      Metric Builder
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Forward Connections Tab */}
                <TabsContent value="forward" className="flex-1 m-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-3 space-y-3">
                      <p className="text-xs text-muted-foreground">
                        → {reachableEntities.length} entities via outgoing references
                      </p>
                      {/* Level-based connections - Forward Only */}
                      {Array.from(reachableByLevel.entries())
                        .sort(([a], [b]) => a - b)
                        .map(([level, entities]) => (
                          <Collapsible
                            key={level}
                            open={currentExpandedLevels.has(level)}
                            onOpenChange={() => toggleLevel(level)}
                          >
                            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 transition-colors">
                              {currentExpandedLevels.has(level) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <span className="font-semibold text-sm">
                                Level {level}
                              </span>
                              <Badge variant="outline" className="text-xs ml-auto">
                                {entities.length} connection{entities.length !== 1 ? "s" : ""}
                              </Badge>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="ml-6 mt-2 space-y-2">
                                {entities.map((entity, idx) => {
                                  const isAdded = isPathSelected(entity);
                                  const isExpanded = selectedPath === entity;

                                  return (
                                    <div
                                      key={`${entity.entityId}-${idx}`}
                                      className={`border rounded-lg transition-colors ${
                                        isExpanded ? "border-primary/50 bg-primary/5" : "border-border"
                                      }`}
                                    >
                                      <button
                                        onClick={() => setSelectedPath(isExpanded ? null : entity)}
                                        className="w-full text-left p-3"
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <div
                                              className="w-3 h-3 rounded-full"
                                              style={{ backgroundColor: entity.color }}
                                            />
                                            <span className="font-medium">
                                              {entity.entityName}
                                            </span>
                                            {entity.isChoice && (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] border-teal-500/50 text-teal-600"
                                              >
                                                choice
                                              </Badge>
                                            )}
                                          </div>
                                          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                                            {entity.viaRef}
                                          </code>
                                        </div>
                                        {renderPathVisualization(entity.path)}
                                      </button>

                                      {isExpanded && (
                                        <div className="px-3 pb-3 pt-2 border-t bg-muted/20">
                                          <div className="space-y-2">
                                            <div>
                                              <span className="text-xs text-muted-foreground">XPath Pattern:</span>
                                              <code className="block text-xs bg-muted p-2 rounded mt-1">
                                                {generateCompoundXPath(entity.path)}
                                              </code>
                                            </div>
                                            <div>
                                              <span className="text-xs text-muted-foreground">Metric Key:</span>
                                              <code className="block text-xs bg-muted p-2 rounded mt-1">
                                                {generateCompoundMetricKey(entity.path)}
                                              </code>
                                            </div>
                                            <Button
                                              size="sm"
                                              className="w-full gap-2"
                                              disabled={isAdded}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleAddPath(entity);
                                              }}
                                            >
                                              <Plus className="w-4 h-4" />
                                              {isAdded ? "Already Added" : "Add Connection Path"}
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Metric Builder Tab - Bidirectional */}
                <TabsContent value="builder" className="flex-1 m-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-3 space-y-3">
                      <p className="text-xs text-muted-foreground">
                        ↔ {bidirectionalReachable.length} entities via all paths (forward + reverse)
                      </p>

                      {/* Suggested Paths Section - Grouped by Degree */}
                      {totalSuggestedPaths > 0 && (
                        <Collapsible
                          open={currentSuggestedPathsOpen}
                          onOpenChange={toggleSuggestedPaths}
                        >
                          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 transition-colors bg-primary/5 border border-primary/20">
                            {currentSuggestedPathsOpen ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <Lightbulb className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-sm">
                              Suggested Paths
                            </span>
                            <Badge variant="secondary" className="text-xs ml-auto">
                              {totalSuggestedPaths}
                            </Badge>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="mt-2 space-y-3">
                              {Array.from(suggestedPathsByDegree.entries())
                                .sort(([a], [b]) => a - b)
                                .map(([degree, paths]) => (
                                  <div key={degree} className="space-y-2">
                                    <div className="flex items-center gap-2 px-2">
                                      <span className="text-xs font-medium text-muted-foreground">
                                        {getDegreeLabel(degree)}
                                      </span>
                                      <Badge variant="outline" className="text-[10px]">
                                        {paths.length}
                                      </Badge>
                                    </div>
                                    <div className="space-y-2">
                                      {paths.map(renderSuggestedPathCard)}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* Level-based connections - Bidirectional */}
                      {Array.from(bidirectionalByLevel.entries())
                        .sort(([a], [b]) => a - b)
                        .map(([level, entities]) => (
                          <Collapsible
                            key={level}
                            open={currentExpandedLevels.has(level)}
                            onOpenChange={() => toggleLevel(level)}
                          >
                            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 transition-colors">
                              {currentExpandedLevels.has(level) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <span className="font-semibold text-sm">
                                Level {level}
                              </span>
                              <Badge variant="outline" className="text-xs ml-auto">
                                {entities.length} connection{entities.length !== 1 ? "s" : ""}
                              </Badge>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="ml-6 mt-2 space-y-2">
                                {entities.map((entity, idx) => {
                                  // Derive per-path config once so the JSX below doesn't
                                  // repeat the generateCompoundMetricKey call on every render
                                  const metricKey = generateCompoundMetricKey(entity.path);
                                  const currentOp = pathOps.get(metricKey) ?? "DISTRIBUTION";
                                  const currentGroupBy = pathGroupBy.get(metricKey);
                                  // DISTINCT_COUNT must have a fully specified groupBy; block "Add" until complete
                                  const groupByIncomplete =
                                    currentOp === "DISTINCT_COUNT" &&
                                    (!currentGroupBy?.entityId || !currentGroupBy?.attribute);

                                  const isAdded = isPathSelected(entity);
                                  const isExpanded = selectedPath === entity;

                                  return (
                                    <div
                                      key={`${entity.entityId}-${idx}`}
                                      className={`border rounded-lg transition-colors ${
                                        isExpanded ? "border-primary/50 bg-primary/5" : "border-border"
                                      }`}
                                    >
                                      <button
                                        onClick={() => setSelectedPath(isExpanded ? null : entity)}
                                        className="w-full text-left p-3"
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <div
                                              className="w-3 h-3 rounded-full"
                                              style={{ backgroundColor: entity.color }}
                                            />
                                            <span className="font-medium">
                                              {entity.entityName}
                                            </span>
                                            {entity.isChoice && (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] border-teal-500/50 text-teal-600"
                                              >
                                                choice
                                              </Badge>
                                            )}
                                            {entity.isReverse && (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] border-amber-500/50 text-amber-600"
                                              >
                                                reverse
                                              </Badge>
                                            )}
                                          </div>
                                          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                                            {entity.viaRef}
                                          </code>
                                        </div>
                                        {renderPathVisualization(entity.path)}
                                      </button>

                                      {isExpanded && (
                                        <div className="px-3 pb-3 pt-2 border-t bg-muted/20">
                                          <div className="space-y-2">
                                            <div>
                                              <span className="text-xs text-muted-foreground">XPath Pattern:</span>
                                              <code className="block text-xs bg-muted p-2 rounded mt-1">
                                                {generateCompoundXPath(entity.path)}
                                              </code>
                                            </div>
                                            <div>
                                              <span className="text-xs text-muted-foreground">Metric Key:</span>
                                              <code className="block text-xs bg-muted p-2 rounded mt-1">
                                                {generateCompoundMetricKey(entity.path)}
                                              </code>
                                            </div>

                                            {/* Operator + Group By ----------------------------------------
                                                 EXISTS and COVERAGE don't need groupBy at all.
                                                 DISTRIBUTION accepts it optionally (attribute-level grouping).
                                                 DISTINCT_COUNT requires it (must be fully set before adding). */}
                                            <div className="border rounded-md p-2 bg-background space-y-2">
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-medium">Operator</span>
                                              </div>
                                              <Select
                                                value={currentOp}
                                                onValueChange={(v) => {
                                                  const newOps = new Map(pathOps);
                                                  newOps.set(metricKey, v as MetricOperator);
                                                  setPathOps(newOps);
                                                  // Clear groupBy when switching to an op that doesn't use it
                                                  if (v !== "DISTRIBUTION" && v !== "DISTINCT_COUNT") {
                                                    const newGroupBy = new Map(pathGroupBy);
                                                    newGroupBy.delete(metricKey);
                                                    setPathGroupBy(newGroupBy);
                                                  }
                                                }}
                                              >
                                                <SelectTrigger className="h-7 text-xs">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="DISTRIBUTION" className="text-xs">DISTRIBUTION</SelectItem>
                                                  <SelectItem value="COVERAGE" className="text-xs">COVERAGE</SelectItem>
                                                  <SelectItem value="EXISTS" className="text-xs">EXISTS</SelectItem>
                                                  <SelectItem value="DISTINCT_COUNT" className="text-xs">DISTINCT_COUNT</SelectItem>
                                                </SelectContent>
                                              </Select>

                                              {/* Group By — only shown for DISTRIBUTION (optional) and DISTINCT_COUNT (required).
                                                  Only entities present in the traversal path AND with known bpmetrics extractors
                                                  are offered as choices. */}
                                              {(currentOp === "DISTRIBUTION" || currentOp === "DISTINCT_COUNT") && (
                                                <div className="space-y-1.5">
                                                  <div className="flex items-center gap-1">
                                                    <span className="text-xs font-medium">Group By</span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                      {currentOp === "DISTINCT_COUNT" ? "(required)" : "(optional)"}
                                                    </span>
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-1.5">
                                                    <Select
                                                      value={currentGroupBy?.entityId ?? ""}
                                                      onValueChange={(v) => {
                                                        const newGroupBy = new Map(pathGroupBy);
                                                        // Reset attribute when entity changes
                                                        newGroupBy.set(metricKey, { entityId: v, attribute: "" });
                                                        setPathGroupBy(newGroupBy);
                                                      }}
                                                    >
                                                      <SelectTrigger className="h-7 text-xs">
                                                        <SelectValue placeholder="Entity" />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        {getEntitiesInPath(entity)
                                                          .filter(eid => KNOWN_GROUP_BY_ATTRIBUTES[eid])
                                                          .map(eid => (
                                                            <SelectItem key={eid} value={eid} className="text-xs">
                                                              {ENTITY_DISPLAY_NAMES[eid] || eid}
                                                            </SelectItem>
                                                          ))}
                                                      </SelectContent>
                                                    </Select>
                                                    <Select
                                                      value={currentGroupBy?.attribute ?? ""}
                                                      disabled={!currentGroupBy?.entityId}
                                                      onValueChange={(v) => {
                                                        const newGroupBy = new Map(pathGroupBy);
                                                        newGroupBy.set(metricKey, {
                                                          entityId: currentGroupBy!.entityId,
                                                          attribute: v,
                                                        });
                                                        setPathGroupBy(newGroupBy);
                                                      }}
                                                    >
                                                      <SelectTrigger className="h-7 text-xs">
                                                        <SelectValue placeholder="Attribute" />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        {currentGroupBy?.entityId &&
                                                          (KNOWN_GROUP_BY_ATTRIBUTES[currentGroupBy.entityId] ?? []).map(attr => (
                                                            <SelectItem key={attr.attribute} value={attr.attribute} className="text-xs">
                                                              {attr.displayName}
                                                            </SelectItem>
                                                          ))}
                                                      </SelectContent>
                                                    </Select>
                                                  </div>
                                                </div>
                                              )}
                                            </div>

                                            {/* Filter Conditions */}
                                            <div className="border rounded-md p-2 bg-background">
                                              <div className="flex items-center gap-1.5 mb-2">
                                                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                                                <span className="text-xs font-medium">Filter Conditions</span>
                                                <span className="text-[10px] text-muted-foreground">(optional)</span>
                                              </div>

                                              {/* Existing filters */}
                                              {(pathFilters.get(generateCompoundMetricKey(entity.path)) || []).map((filter, fIdx) => (
                                                <div key={fIdx} className="flex items-center gap-1.5 mb-1.5 text-xs">
                                                  <Badge variant="outline" className="text-[10px]">
                                                    {ENTITY_DISPLAY_NAMES[filter.entity] || filter.entity}
                                                  </Badge>
                                                  <span className="text-muted-foreground">{filter.attributeDisplay || filter.attribute}</span>
                                                  <span className="font-mono text-[10px]">{filter.operator}</span>
                                                  <code className="bg-muted px-1 rounded text-[10px]">
                                                    {Array.isArray(filter.value) ? filter.value.join(", ") : filter.value}
                                                  </code>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 w-5 p-0"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      removeFilterFromPath(generateCompoundMetricKey(entity.path), fIdx);
                                                    }}
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </Button>
                                                </div>
                                              ))}

                                              {/* Add filter form */}
                                              {filterDraft && selectedPath === entity ? (
                                                <div className="space-y-1.5 mt-2">
                                                  <div className="grid grid-cols-3 gap-1.5">
                                                    <Select
                                                      value={filterDraft.entity}
                                                      onValueChange={(v) => setFilterDraft({ ...filterDraft, entity: v, attribute: "" })}
                                                    >
                                                      <SelectTrigger className="h-7 text-xs">
                                                        <SelectValue placeholder="Entity" />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        {getEntitiesInPath(entity).map(eid => (
                                                          <SelectItem key={eid} value={eid} className="text-xs">
                                                            {ENTITY_DISPLAY_NAMES[eid] || eid}
                                                          </SelectItem>
                                                        ))}
                                                      </SelectContent>
                                                    </Select>
                                                    <Select
                                                      value={filterDraft.attribute}
                                                      onValueChange={(v) => setFilterDraft({ ...filterDraft, attribute: v })}
                                                    >
                                                      <SelectTrigger className="h-7 text-xs">
                                                        <SelectValue placeholder="Attribute" />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        {filterDraft.entity && getEntityAttributes(filterDraft.entity).map(attr => (
                                                          <SelectItem key={attr.id} value={attr.name} className="text-xs">
                                                            {attr.displayName || attr.name}
                                                          </SelectItem>
                                                        ))}
                                                      </SelectContent>
                                                    </Select>
                                                    <Input
                                                      placeholder="Value"
                                                      value={filterDraft.value}
                                                      onChange={(e) => setFilterDraft({ ...filterDraft, value: e.target.value })}
                                                      className="h-7 text-xs"
                                                    />
                                                  </div>
                                                  <div className="flex gap-1.5">
                                                    <Button
                                                      size="sm"
                                                      variant="secondary"
                                                      className="h-6 text-xs px-2"
                                                      disabled={!filterDraft.entity || !filterDraft.attribute || !filterDraft.value}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        const attr = getEntityAttributes(filterDraft.entity).find(a => a.name === filterDraft.attribute);
                                                        addFilterToPath(generateCompoundMetricKey(entity.path), {
                                                          entity: filterDraft.entity,
                                                          attribute: filterDraft.attribute,
                                                          attributeDisplay: attr?.displayName || filterDraft.attribute,
                                                          operator: "equals",
                                                          value: filterDraft.value,
                                                        });
                                                        setFilterDraft(null);
                                                      }}
                                                    >
                                                      Apply
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      className="h-6 text-xs px-2"
                                                      onClick={(e) => { e.stopPropagation(); setFilterDraft(null); }}
                                                    >
                                                      Cancel
                                                    </Button>
                                                  </div>
                                                </div>
                                              ) : (
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-6 text-xs px-2 gap-1 mt-1"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFilterDraft({ entity: "", attribute: "", value: "" });
                                                  }}
                                                >
                                                  <Plus className="w-3 h-3" />
                                                  Add Filter
                                                </Button>
                                              )}
                                            </div>

                                            {/* Disable Add when DISTINCT_COUNT has no groupBy set yet */}
                                            <Button
                                              size="sm"
                                              className="w-full gap-2"
                                              disabled={isAdded || groupByIncomplete}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleAddPath(entity);
                                              }}
                                            >
                                              <Plus className="w-4 h-4" />
                                              {isAdded ? "Already Added" : "Add Connection Path"}
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Select a source entity</p>
                <p className="text-sm mt-1">
                  Choose an entity from the left to explore its connections
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
