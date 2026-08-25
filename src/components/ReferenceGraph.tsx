import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { Entity } from "@/types/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitBranch, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import {
  ENTITY_COLORS,
  XSD_REFERENCES,
  ENTITY_DISPLAY_NAMES,
} from "@/services/graphTraversal";

interface ReferenceGraphProps {
  entities: Entity[];
}

interface NodePosition {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

// Get initial positions based on entities
const getInitialPositions = (entities: Entity[]): NodePosition[] => {
  const width = 900;
  const centerX = width / 2;
  
  const positions: NodePosition[] = [
    { id: "biological_being_entity", name: "Biological Being", x: centerX, y: 50, color: ENTITY_COLORS.biological_being_entity },
    { id: "case_entity", name: "Case", x: centerX - 200, y: 130, color: ENTITY_COLORS.case_entity },
    { id: "dataset_entity", name: "Dataset", x: centerX + 200, y: 130, color: ENTITY_COLORS.dataset_entity },
    { id: "specimen_entity", name: "Specimen", x: centerX - 100, y: 210, color: ENTITY_COLORS.specimen_entity },
    { id: "landing_page_entity", name: "Landing Page", x: centerX + 320, y: 210, color: ENTITY_COLORS.landing_page_entity },
    { id: "rems_entity", name: "REMS", x: centerX + 200, y: 290, color: ENTITY_COLORS.rems_entity },
    { id: "organisation_entity", name: "Organisation", x: centerX + 320, y: 370, color: ENTITY_COLORS.organisation_entity },
    { id: "policy_entity", name: "Policy", x: centerX + 200, y: 450, color: ENTITY_COLORS.policy_entity },
    { id: "block_entity", name: "Block", x: centerX - 200, y: 290, color: ENTITY_COLORS.block_entity },
    { id: "observer_entity", name: "Observer", x: centerX + 80, y: 370, color: ENTITY_COLORS.observer_entity },
    { id: "slide_entity", name: "Slide", x: centerX - 280, y: 370, color: ENTITY_COLORS.slide_entity },
    { id: "staining_entity", name: "Staining", x: centerX - 100, y: 370, color: ENTITY_COLORS.staining_entity },
    { id: "image_entity", name: "Image", x: centerX - 280, y: 450, color: ENTITY_COLORS.image_entity },
    { id: "observation_entity", name: "Observation", x: centerX + 80, y: 450, color: ENTITY_COLORS.observation_entity },
    { id: "annotation_entity", name: "Annotation", x: centerX - 100, y: 530, color: ENTITY_COLORS.annotation_entity },
  ];
  
  const entityIds = new Set(entities.map(e => e.id));
  return positions.filter(p => entityIds.has(p.id));
};

export const ReferenceGraph = ({
  entities,
}: ReferenceGraphProps) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<NodePosition[]>([]);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize positions when entities change
  useEffect(() => {
    setNodePositions(getInitialPositions(entities));
  }, [entities]);

  // Filter references to only show entities that exist in the loaded data
  const references = useMemo(() => {
    const entityIds = new Set(entities.map(e => e.id));
    return XSD_REFERENCES.filter(ref => entityIds.has(ref.from) && entityIds.has(ref.to));
  }, [entities]);

  const getNodePosition = (id: string) => nodePositions.find(n => n.id === id);

  // Convert screen coordinates to SVG coordinates
  const screenToSVG = useCallback((screenX: number, screenY: number) => {
    if (!svgRef.current) return { x: screenX, y: screenY };
    
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return { x: screenX, y: screenY };
    
    return {
      x: (screenX - ctm.e) / ctm.a,
      y: (screenY - ctm.f) / ctm.d,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const node = nodePositions.find(n => n.id === nodeId);
    if (!node) return;
    
    const svgCoords = screenToSVG(e.clientX, e.clientY);
    setDragOffset({
      x: svgCoords.x - node.x,
      y: svgCoords.y - node.y,
    });
    setDraggingNode(nodeId);
  }, [nodePositions, screenToSVG]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingNode) return;
    
    const svgCoords = screenToSVG(e.clientX, e.clientY);
    
    setNodePositions(prev => prev.map(node => 
      node.id === draggingNode
        ? { ...node, x: svgCoords.x - dragOffset.x, y: svgCoords.y - dragOffset.y }
        : node
    ));
  }, [draggingNode, dragOffset, screenToSVG]);

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
  }, []);

  const handleResetLayout = useCallback(() => {
    setNodePositions(getInitialPositions(entities));
    setSelectedNode(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [entities]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 3));
  }, []);

  // Pan handlers for background drag
  const handleBackgroundMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as Element).tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && !draggingNode) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  }, [isPanning, panStart, draggingNode]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Get references related to hovered/selected node
  const highlightedRefs = useMemo(() => {
    const activeNode = selectedNode || hoveredNode;
    if (!activeNode) return new Set<string>();
    
    const relatedRefs = new Set<string>();
    references.forEach((ref, idx) => {
      if (ref.from === activeNode || ref.to === activeNode) {
        relatedRefs.add(`${ref.from}-${ref.to}-${idx}`);
      }
    });
    return relatedRefs;
  }, [selectedNode, hoveredNode, references]);

  const activeNode = selectedNode || hoveredNode;

  // Calculate viewBox based on zoom and pan
  const viewBox = useMemo(() => {
    const baseWidth = 900;
    const baseHeight = 600;
    const scaledWidth = baseWidth / zoom;
    const scaledHeight = baseHeight / zoom;
    const offsetX = (baseWidth - scaledWidth) / 2 - (pan.x / zoom);
    const offsetY = (baseHeight - scaledHeight) / 2 - (pan.y / zoom);
    return `${offsetX} ${offsetY} ${scaledWidth} ${scaledHeight}`;
  }, [zoom, pan]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitBranch className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">Entity Reference Graph</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Drag nodes to rearrange. Arrows show "has reference to" direction.
            </p>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              className="h-8 w-8 p-0"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              className="h-8 w-8 p-0"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetLayout}
              className="flex items-center gap-1.5 ml-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4">
        {/* Graph */}
        <div 
          ref={containerRef}
          className="flex-1 min-h-[400px] lg:min-h-0 relative border rounded-lg bg-muted/20 overflow-hidden"
        >
          <svg
            ref={svgRef}
            onMouseMove={(e) => {
              handleMouseMove(e);
              handlePanMove(e);
            }}
            onMouseUp={() => {
              handleMouseUp();
              handlePanEnd();
            }}
            onMouseLeave={() => {
              handleMouseUp();
              handlePanEnd();
            }}
            onMouseDown={handleBackgroundMouseDown}
            onWheel={handleWheel}
            onClick={(e) => {
              if (e.target === svgRef.current && !isPanning) {
                setSelectedNode(null);
              }
            }}
            width="100%"
            height="100%"
            viewBox={viewBox}
            className={`select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
                fill="hsl(var(--muted-foreground))"
              >
                <polygon points="0 0, 10 3.5, 0 7" />
              </marker>
              <marker
                id="arrowhead-highlighted"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
                fill="hsl(var(--primary))"
              >
                <polygon points="0 0, 10 3.5, 0 7" />
              </marker>
              <marker
                id="arrowhead-optional"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
                fill="hsl(var(--muted-foreground) / 0.5)"
              >
                <polygon points="0 0, 10 3.5, 0 7" />
              </marker>
            </defs>

            {/* Edges */}
            {references.map((ref, idx) => {
              const fromPos = getNodePosition(ref.from);
              const toPos = getNodePosition(ref.to);
              if (!fromPos || !toPos) return null;

              const refKey = `${ref.from}-${ref.to}-${idx}`;
              const isHighlighted = highlightedRefs.has(refKey);
              const isActive = activeNode === ref.from || activeNode === ref.to;
              const opacity = activeNode ? (isActive ? 1 : 0.1) : (ref.isChoice ? 0.5 : 0.8);

              // Calculate edge with offset to avoid node overlap
              const dx = toPos.x - fromPos.x;
              const dy = toPos.y - fromPos.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const nodeRadius = 38;
              
              const startX = fromPos.x + (dx / dist) * nodeRadius;
              const startY = fromPos.y + (dy / dist) * nodeRadius;
              const endX = toPos.x - (dx / dist) * (nodeRadius + 10);
              const endY = toPos.y - (dy / dist) * (nodeRadius + 10);

              // Control point for curved edge
              const midX = (startX + endX) / 2;
              const midY = (startY + endY) / 2;
              const curveFactor = ref.isChoice ? 40 : 25;
              const perpX = -(endY - startY) / dist * curveFactor;
              const perpY = (endX - startX) / dist * curveFactor;

              return (
                <g key={refKey}>
                  <path
                    d={`M ${startX} ${startY} Q ${midX + perpX} ${midY + perpY} ${endX} ${endY}`}
                    fill="none"
                    stroke={isHighlighted ? "hsl(var(--primary))" : ref.isChoice ? "hsl(175, 60%, 45%)" : "hsl(var(--muted-foreground))"}
                    strokeWidth={isHighlighted ? 2.5 : 1.5}
                    strokeDasharray={ref.isChoice ? "5,3" : "none"}
                    opacity={opacity}
                    markerEnd={isHighlighted ? "url(#arrowhead-highlighted)" : "url(#arrowhead)"}
                    className="transition-all duration-200"
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {nodePositions.map((node) => {
              const isHovered = hoveredNode === node.id;
              const isSelected = selectedNode === node.id;
              const isDragging = draggingNode === node.id;
              const isRelated = activeNode && references.some(
                r => (r.from === activeNode && r.to === node.id) || (r.to === activeNode && r.from === node.id)
              );
              const opacity = activeNode ? (isHovered || isSelected || isRelated || activeNode === node.id ? 1 : 0.25) : 1;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseEnter={() => !draggingNode && setHoveredNode(node.id)}
                  onMouseLeave={() => !draggingNode && setHoveredNode(null)}
                  onMouseDown={(e) => handleMouseDown(e, node.id)}
                  onClick={() => !isDragging && setSelectedNode(selectedNode === node.id ? null : node.id)}
                  className={isDragging ? "cursor-grabbing" : "cursor-grab"}
                  style={{ opacity }}
                >
                  <circle
                    r={isDragging ? 44 : isHovered || isSelected ? 42 : 38}
                    fill={node.color}
                    stroke={isDragging ? "hsl(var(--primary))" : isSelected ? "hsl(var(--foreground))" : isHovered ? "hsl(var(--primary))" : "transparent"}
                    strokeWidth={isDragging ? 4 : 3}
                    className={isDragging ? "" : "transition-all duration-200"}
                    filter={isDragging ? "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" : undefined}
                  />
                  <text
                    textAnchor="middle"
                    dy="0.35em"
                    fill="white"
                    fontSize="10"
                    fontWeight="600"
                    className="pointer-events-none select-none"
                  >
                    {node.name.split(' ').map((word, i, arr) => (
                      <tspan key={i} x="0" dy={i === 0 ? `${-0.5 * (arr.length - 1)}em` : "1.1em"}>
                        {word}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend / Details Panel */}
        <div className="w-full lg:w-80 flex flex-col gap-4 overflow-hidden max-h-[60vh] lg:max-h-none">
          <div className="space-y-2 flex-shrink-0">
            <h4 className="font-semibold text-sm">Entities</h4>
            <div className="flex flex-wrap gap-1.5">
              {nodePositions.map((node) => (
                <Badge
                  key={node.id}
                  variant={selectedNode === node.id ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  style={{
                    backgroundColor: selectedNode === node.id ? node.color : 'transparent',
                    borderColor: node.color,
                    color: selectedNode === node.id ? 'white' : node.color,
                  }}
                  onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                >
                  {node.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1 text-xs flex-shrink-0">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-0.5 bg-muted-foreground"></div>
              <span>Direct reference</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-8 h-0.5" style={{ borderTop: "2px dashed hsl(175, 60%, 45%)" }}></div>
              <span>Choice (one of many)</span>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <h4 className="font-semibold text-sm flex-shrink-0 mb-2">
              References {activeNode && `for ${nodePositions.find(n => n.id === activeNode)?.name}`}
            </h4>
            <div className="flex-1 overflow-y-auto space-y-1.5 text-xs pr-1">
              {(activeNode
                ? references.filter(r => r.from === activeNode || r.to === activeNode)
                : references
              ).map((ref, idx) => {
                const fromNode = nodePositions.find(n => n.id === ref.from);
                const toNode = nodePositions.find(n => n.id === ref.to);
                if (!fromNode || !toNode) return null;
                
                return (
                  <div
                    key={idx}
                    className={`p-2 rounded border ${ref.isChoice ? 'border-dashed border-teal-500/50' : ''} bg-muted/30`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span style={{ color: fromNode.color }} className="font-semibold">
                        {fromNode.name}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span style={{ color: toNode.color }} className="font-semibold">
                        {toNode.name}
                      </span>
                      {ref.isChoice && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 ml-auto border-teal-500/50 text-teal-600">choice</Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      <code className="text-[10px] bg-muted px-1 rounded">{ref.refName}</code>
                    </div>
                    <p className="text-muted-foreground mt-1">{ref.description}</p>
                  </div>
                );
              })}
              {references.length === 0 && (
                <p className="text-muted-foreground italic">No reference attributes found</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
