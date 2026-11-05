import { useState, useEffect } from "react";
import { Entity, Attribute, Selection, ConfigOutput, CompoundMetricPath } from "@/types/schema";
import { parseAllEntities, SchemaLoadStatus } from "@/services/xmlSchemaParser";
import { buildSelection } from "@/lib/buildSelection";
import { getSchemaMetadata, needsUpdate } from "@/services/schemaFetcher";
import { EntityList } from "@/components/EntityList";
import { AttributeTable } from "@/components/AttributeTable";
import { SelectionPanel } from "@/components/SelectionPanel";
import { JsonPreview } from "@/components/JsonPreview";
import { ReferenceGraph } from "@/components/ReferenceGraph";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, RefreshCw, GitBranch, List, Link2, HelpCircle, Filter, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { ChangelogPopover } from "@/components/ChangelogPopover";
import { toast } from "sonner";
import { ConnectionExplorer } from "@/components/ConnectionExplorer";
import { CompoundMetricsPanel } from "@/components/CompoundMetricsPanel";
import { WelcomeModal } from "@/components/WelcomeModal";
import { generateModelJson } from "@/services/modelJsonGenerator";

const Index = () => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("explorer");
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [selectedAttributes, setSelectedAttributes] = useState<Set<string>>(new Set());
  const [selections, setSelections] = useState<Selection[]>([]);
  const [compoundMetrics, setCompoundMetrics] = useState<CompoundMetricPath[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [loadStatus, setLoadStatus] = useState<SchemaLoadStatus | "loading">("loading");

  const reportLoadOutcome = (
    filteredEntities: Entity[],
    status: SchemaLoadStatus,
    fallbackFiles: string[],
    refreshed: boolean,
  ) => {
    const totalAttrs = filteredEntities.reduce((acc, e) => acc + e.attributes.length, 0);
    const verb = refreshed ? "Refreshed" : "Loaded";

    if (status === "failed") {
      toast.error(
        "Couldn't load schemas — GitHub is unreachable and no offline copy was found. Check your connection and try Refresh Schemas.",
      );
    } else if (status === "degraded") {
      toast.warning(
        `${verb} ${filteredEntities.length} entities with ${totalAttrs} attributes, but ${fallbackFiles.length} schema file(s) couldn't be freshly fetched and came from cached or bundled offline data — some data may be out of date.`,
      );
    } else {
      toast.success(`${verb} ${filteredEntities.length} entities with ${totalAttrs} attributes`);
    }
  };

  useEffect(() => {
    // Load schema data asynchronously
    const loadSchemas = async () => {
      try {
        const metadata = getSchemaMetadata();
        const shouldUpdate = needsUpdate();

        if (metadata && !shouldUpdate) {
          toast.info(`Loading cached schemas (last updated: ${new Date(metadata.lastFetched).toLocaleString()})...`);
        } else {
          toast.info("Fetching schemas from GitHub repository...");
        }

        const { entities: loadedEntities, status, fallbackFiles } = await parseAllEntities(shouldUpdate);
        // Filter out landing page related entity
        const filteredEntities = loadedEntities.filter(
          (e) => e.id !== "landing_page" && e.id !== "landing_page_entity" && !e.name.toLowerCase().includes("landing"),
        );
        setEntities(filteredEntities);
        setLoadStatus(status);
        if (filteredEntities.length > 0) {
          setSelectedEntity(filteredEntities[0].id);
        }

        reportLoadOutcome(filteredEntities, status, fallbackFiles, false);
      } catch (error) {
        console.error("Failed to load schemas:", error);
        setLoadStatus("failed");
        toast.error("Failed to load schemas from repository");
      }
    };

    loadSchemas();
  }, []);

  const handleRefreshSchemas = async () => {
    setIsRefreshing(true);
    try {
      toast.info("Refreshing schemas from GitHub...");
      const { entities: loadedEntities, status, fallbackFiles } = await parseAllEntities(true);
      // Filter out landing page related entity
      const filteredEntities = loadedEntities.filter(
        (e) => e.id !== "landing_page" && e.id !== "landing_page_entity" && !e.name.toLowerCase().includes("landing"),
      );
      setEntities(filteredEntities);
      setLoadStatus(status);

      reportLoadOutcome(filteredEntities, status, fallbackFiles, true);
    } catch (error) {
      console.error("Failed to refresh schemas:", error);
      setLoadStatus("failed");
      toast.error("Failed to refresh schemas");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleEntity = (entityId: string) => {
    const newSelectedEntities = new Set(selectedEntities);
    const entity = entities.find((e) => e.id === entityId);

    if (!entity) return;

    if (newSelectedEntities.has(entityId)) {
      // Remove entity and all its attributes
      newSelectedEntities.delete(entityId);
      const attributeIds = entity.attributes.map((a) => a.id);
      setSelectedAttributes(new Set([...selectedAttributes].filter((id) => !attributeIds.includes(id))));
      setSelections(selections.filter((s) => !attributeIds.includes(s.id)));
    } else {
      // Add entity and all its attributes
      newSelectedEntities.add(entityId);
      const newAttributeIds = entity.attributes.map((a) => a.id);
      setSelectedAttributes(new Set([...selectedAttributes, ...newAttributeIds]));

      const newSelections = entity.attributes.map((attr) => buildSelection(entity, attr));

      setSelections([...selections, ...newSelections]);
    }

    setSelectedEntities(newSelectedEntities);
  };

  const handleToggleAttribute = (attributeId: string) => {
    const newSelectedAttributes = new Set(selectedAttributes);

    if (newSelectedAttributes.has(attributeId)) {
      newSelectedAttributes.delete(attributeId);
      setSelections(selections.filter((s) => s.id !== attributeId));
    } else {
      newSelectedAttributes.add(attributeId);

      // Find the attribute and create selection
      let attribute: Attribute | undefined;
      let entity: Entity | undefined;

      for (const e of entities) {
        const attr = e.attributes.find((a) => a.id === attributeId);
        if (attr) {
          attribute = attr;
          entity = e;
          break;
        }
      }

      if (attribute && entity) {
        setSelections([...selections, buildSelection(entity, attribute)]);
      }
    }

    setSelectedAttributes(newSelectedAttributes);
  };

  const handleToggleManyAttributes = (attributeIds: string[], select: boolean) => {
    const newSelectedAttributes = new Set(selectedAttributes);
    if (select) {
      const toAdd = attributeIds.filter((id) => !newSelectedAttributes.has(id));
      const newSelections: Selection[] = [];
      for (const id of toAdd) {
        newSelectedAttributes.add(id);
        let attribute: Attribute | undefined;
        let entity: Entity | undefined;
        for (const e of entities) {
          const attr = e.attributes.find((a) => a.id === id);
          if (attr) {
            attribute = attr;
            entity = e;
            break;
          }
        }
        if (attribute && entity) {
          newSelections.push(buildSelection(entity, attribute));
        }
      }
      setSelections([...selections, ...newSelections]);
    } else {
      const idSet = new Set(attributeIds);
      idSet.forEach((id) => newSelectedAttributes.delete(id));
      setSelections(selections.filter((s) => !idSet.has(s.id)));
    }
    setSelectedAttributes(newSelectedAttributes);
  };

  const handleSelectSlidetapMinimum = () => {
    const targetIds = ["biological_being", "case", "specimen", "block", "slide", "image"];
    const ids: string[] = [];
    const missing: string[] = [];
    for (const target of targetIds) {
      // Match against entity id with or without "_entity" suffix, plus name fallback
      const entity =
        entities.find((e) => e.id === target) ||
        entities.find((e) => e.id === `${target}_entity`) ||
        entities.find((e) => e.id.replace(/_entity$/, "") === target) ||
        entities.find((e) => e.name.toLowerCase().replace(/\s+entity$/, "").replace(/\s+/g, "_") === target);
      if (!entity) {
        missing.push(target);
        continue;
      }
      for (const attr of entity.attributes) {
        if (attr.required) ids.push(attr.id);
      }
    }

    const toAdd = ids.filter((id) => !selectedAttributes.has(id));
    if (toAdd.length === 0) {
      toast.info("All MSMdad-required slidetap attributes are already selected");
    } else {
      handleToggleManyAttributes(toAdd, true);
      toast.success(`Added ${toAdd.length} MSMdad-required attribute${toAdd.length === 1 ? "" : "s"}`);
    }
    if (missing.length > 0) {
      toast.warning(`Entities not found in loaded schema: ${missing.join(", ")}`);
    }
  };

  const handleClearAll = () => {
    setSelections([]);
    setSelectedAttributes(new Set());
    setSelectedEntities(new Set());
  };

  const handleRemoveSelection = (id: string) => {
    setSelections(selections.filter((s) => s.id !== id));
    setSelectedAttributes(new Set([...selectedAttributes].filter((attrId) => attrId !== id)));


    // Check if we need to uncheck the entity
    const entity = entities.find((e) => e.attributes.some((a) => a.id === id));
    if (entity) {
      const allEntityAttrsSelected = entity.attributes.every((a) =>
        a.id === id ? false : selectedAttributes.has(a.id),
      );
      if (!allEntityAttrsSelected) {
        const newSelectedEntities = new Set(selectedEntities);
        newSelectedEntities.delete(entity.id);
        setSelectedEntities(newSelectedEntities);
      }
    }
  };

  // Filter entities and attributes based on search query
  const filterBySearch = (text: string, query: string) => {
    return text.toLowerCase().includes(query.toLowerCase());
  };

  const filteredEntities = entities.filter((entity) => {
    if (!searchQuery) return true;

    // Search in entity name and description
    if (filterBySearch(entity.name, searchQuery)) return true;
    if (entity.description && filterBySearch(entity.description, searchQuery)) return true;

    // Search in entity attributes
    return entity.attributes.some((attr) => {
      return (
        filterBySearch(attr.name, searchQuery) ||
        (attr.displayName && filterBySearch(attr.displayName, searchQuery)) ||
        (attr.description && filterBySearch(attr.description, searchQuery)) ||
        filterBySearch(attr.type, searchQuery) ||
        (attr.msmdadId && filterBySearch(attr.msmdadId, searchQuery)) ||
        (attr.xmlFile && filterBySearch(attr.xmlFile, searchQuery)) ||
        (attr.xpath && filterBySearch(attr.xpath, searchQuery))
      );
    });
  });

  const getFilteredAttributes = (entityId: string) => {
    const entity = entities.find((e) => e.id === entityId);
    if (!entity) return [];

    if (!searchQuery) return entity.attributes;

    return entity.attributes.filter((attr) => {
      return (
        filterBySearch(attr.name, searchQuery) ||
        (attr.displayName && filterBySearch(attr.displayName, searchQuery)) ||
        (attr.description && filterBySearch(attr.description, searchQuery)) ||
        filterBySearch(attr.type, searchQuery) ||
        (attr.msmdadId && filterBySearch(attr.msmdadId, searchQuery)) ||
        (attr.xmlFile && filterBySearch(attr.xmlFile, searchQuery)) ||
        (attr.xpath && filterBySearch(attr.xpath, searchQuery))
      );
    });
  };

  // Compound metrics handlers
  const handleAddCompoundMetric = (metric: CompoundMetricPath) => {
    // Check if already exists
    if (compoundMetrics.some(m => m.metricKey === metric.metricKey)) {
      toast.info("This connection path is already added");
      return;
    }
    setCompoundMetrics([...compoundMetrics, metric]);
    toast.success("Connection path added");
  };

  const handleRemoveCompoundMetric = (id: string) => {
    setCompoundMetrics(compoundMetrics.filter(m => m.id !== id));
  };

  const generateConfig = (): ConfigOutput => {
    return {
      version: 1,
      generated_at: new Date().toISOString(),
      source_schema_repo: "https://github.com/imi-bigpicture/bigpicture-msmdad/tree/main",
      selections,
      compoundMetrics: compoundMetrics.length > 0 ? compoundMetrics : undefined,
    };
  };

  const handleDownload = () => {
    const config = generateConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bpmetrics-config-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Configuration downloaded");
  };

  const handleDownloadCompoundMetrics = () => {
    const config = {
      version: 1,
      generated_at: new Date().toISOString(),
      source_schema_repo: "https://github.com/imi-bigpicture/bigpicture-msmdad/tree/main",
      compoundMetrics,
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bpmetrics-compound-config-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Compound metrics configuration downloaded");
  };

  const handleDownloadModelJson = async () => {
    const { json, skippedEntities } = await generateModelJson(selections, entities);
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "model.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (skippedEntities.length > 0) {
      toast.warning(`model.json only covers biological_being, specimen, block and image. Skipped: ${skippedEntities.join(", ")}`);
    } else {
      toast.success("model.json downloaded");
    }
  };

  const currentEntity = entities.find((e) => e.id === selectedEntity);

  return (
    <div className={`flex flex-col bg-background ${activeTab === 'graph' ? 'min-h-screen lg:h-screen lg:overflow-hidden' : 'min-h-screen'}`}>
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Database className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-2xl font-bold text-foreground leading-tight">bpmetrics Config Builder</h1>
                  <ChangelogPopover />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">Metadata Extraction Helper</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:flex-wrap">
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                    <Link to="/bpselect">
                      <Filter className="w-4 h-4 mr-2" />
                      bpselect Config
                    </Link>
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-72">
                  <p className="text-sm text-muted-foreground">
                    bpselect is a Go-based runtime selection tool for Bigpicture metadata archives. It consumes a SelectionConfig, scans the archive, and produces a manifest of matched images with their biological context. This site builds that config. It is still experimental and not deployed in production.
                  </p>
                  <a
                    href="https://github.com/imi-bigpicture/bpselect"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center text-sm text-primary hover:underline"
                  >
                    View bpselect repository
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="ml-1"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" x2="21" y1="14" y2="3" />
                    </svg>
                  </a>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Repository is private; requires imi-bigpicture organization access.
                  </p>
                </HoverCardContent>
              </HoverCard>
              <Button variant="ghost" size="sm" onClick={() => setShowWelcome(true)} className="w-full sm:w-auto">
                <HelpCircle className="w-4 h-4 mr-2" />
                Help
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefreshSchemas} disabled={isRefreshing} className="w-full sm:w-auto">
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh Schemas</span>
                <span className="sm:hidden">Refresh</span>
              </Button>
              <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                <a
                  href="https://github.com/imi-bigpicture/bigpicture-msmdad/tree/main"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  MSMDAD Repo
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                <a
                  href="https://github.com/imi-bigpicture/bigpicture-metaflex"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Metaflex Repo
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Disclaimer */}
      <div className="container mx-auto px-3 sm:px-6 pt-3 sm:pt-4">
        <Alert variant="default" className="bg-muted/50 text-muted-foreground border-border">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Originally created and authored by Emre Balsever, now contributed to the imi-bigpicture organization as an open-source tool. It is provided as-is; maintenance ownership is being transitioned within the Bigpicture project.
          </AlertDescription>
        </Alert>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 container mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col">
        <Tabs defaultValue="explorer" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full sm:w-auto sm:inline-flex flex justify-center h-auto flex-wrap sm:flex-nowrap gap-1">
            <TabsTrigger value="explorer" className="gap-2 whitespace-nowrap">
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Schema Explorer</span>
              <span className="sm:hidden">Schema</span>
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-2 whitespace-nowrap">
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">Connection Explorer</span>
              <span className="sm:hidden">Connections</span>
            </TabsTrigger>
            <TabsTrigger value="graph" className="gap-2 whitespace-nowrap">
              <GitBranch className="w-4 h-4" />
              <span className="hidden sm:inline">Reference Graph</span>
              <span className="sm:hidden">Graph</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explorer" className="mt-4">
            <div className="space-y-4 sm:space-y-6">
              {/* Top Section - Entity List & Attribute Table */}
              <div
                className="h-auto lg:h-[600px] lg:min-h-[400px] lg:max-h-[900px] lg:overflow-hidden"
                style={{ resize: 'vertical' }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 h-full min-h-0">
                  {/* Left Panel - Entity List */}
                  <div className="lg:col-span-3 h-[320px] lg:h-full min-h-0">
                    <EntityList
                      entities={filteredEntities}
                      selectedEntity={selectedEntity}
                      onSelectEntity={setSelectedEntity}
                      selectedEntities={selectedEntities}
                      onToggleEntity={handleToggleEntity}
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      emptyMessage={
                        loadStatus === "failed"
                          ? "Couldn't load schemas — check your connection and try Refresh Schemas."
                          : loadStatus === "loading"
                            ? "Loading schemas..."
                            : undefined
                      }
                    />
                  </div>

                  {/* Middle Panel - Attribute Table */}
                  <div className="lg:col-span-9 h-[500px] lg:h-full min-h-0 overflow-hidden">
                    {currentEntity ? (
                      <AttributeTable
                        entityName={currentEntity.name}
                        attributes={getFilteredAttributes(currentEntity.id)}
                        selectedAttributes={selectedAttributes}
                        onToggleAttribute={handleToggleAttribute}
                        onToggleManyAttributes={handleToggleManyAttributes}
                        onSelectSlidetapMinimum={handleSelectSlidetapMinimum}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-card rounded-lg border">
                        <p className="text-muted-foreground text-center px-6">
                          {entities.length === 0 && loadStatus === "failed"
                            ? "Couldn't load schemas. Check your connection and try \"Refresh Schemas\" above."
                            : searchQuery
                              ? "No entities match your search"
                              : "Select an entity to view attributes"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Section - Selection Panel */}
              <div className="h-[600px] lg:h-[1400px]">
                <SelectionPanel
                  selections={selections}
                  onRemoveSelection={handleRemoveSelection}
                  onClearAll={handleClearAll}
                  onDownload={handleDownload}
                  onPreview={() => setShowPreview(true)}
                  onDownloadModelJson={handleDownloadModelJson}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="connections" className="mt-4">
            <div className="space-y-4">
              <div
                className="h-[500px] lg:min-h-[300px] lg:max-h-[800px] overflow-hidden"
                style={{ resize: 'vertical' }}
              >
                <ConnectionExplorer
                  entities={entities}
                  onAddCompoundMetric={handleAddCompoundMetric}
                  selectedCompoundMetrics={compoundMetrics}
                />
              </div>
              
              <CompoundMetricsPanel
                compoundMetrics={compoundMetrics}
                onRemoveMetric={handleRemoveCompoundMetric}
                onDownload={handleDownloadCompoundMetrics}
              />
            </div>
          </TabsContent>

          <TabsContent value="graph" className="mt-4 min-h-[80vh] lg:h-[calc(100vh-180px)]">
            <ReferenceGraph entities={entities} />
          </TabsContent>
        </Tabs>
      </div>

      {/* JSON Preview Modal */}
      {showPreview && <JsonPreview config={generateConfig()} onClose={() => setShowPreview(false)} />}
      
      {/* Welcome Modal */}
      <WelcomeModal isOpen={showWelcome} onOpenChange={setShowWelcome} />
    </div>
  );
};

export default Index;
