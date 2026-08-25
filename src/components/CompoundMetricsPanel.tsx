import { CompoundMetricPath } from "@/types/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Download, Link2, ArrowRight, Filter, Layers } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ENTITY_COLORS, ENTITY_DISPLAY_NAMES } from "@/services/graphTraversal";

interface CompoundMetricsPanelProps {
  compoundMetrics: CompoundMetricPath[];
  onRemoveMetric: (id: string) => void;
  onDownload: () => void;
}

export const CompoundMetricsPanel = ({
  compoundMetrics,
  onRemoveMetric,
  onDownload,
}: CompoundMetricsPanelProps) => {
  return (
    <Card className="flex flex-col bg-background">
      <div className="p-4 border-b bg-muted/30 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Selected Connection Paths
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {compoundMetrics.length} compound{" "}
            {compoundMetrics.length === 1 ? "metric" : "metrics"} selected
          </p>
        </div>
        <Button
          size="sm"
          onClick={onDownload}
          disabled={compoundMetrics.length === 0}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Download Config
        </Button>
      </div>
      <div>
        {compoundMetrics.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No connection paths selected yet.</p>
            <p className="text-sm mt-2">
              Use the Connection Explorer above to discover and add multi-entity paths.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Group By</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Filters</TableHead>
                <TableHead>Metric Key</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compoundMetrics.map((metric) => (
                <TableRow key={metric.id}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">
                      {metric.description}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="text-xs font-mono"
                    >
                      {metric.op}
                    </Badge>
                  </TableCell>
                  {/* Show the groupBy config so it's visible after adding.
                      Rendered as "EntityName · attribute" for quick readability. */}
                  <TableCell>
                    {metric.groupBy ? (
                      <div className="flex items-center gap-1 text-xs">
                        <Layers className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">
                          {ENTITY_DISPLAY_NAMES[metric.groupBy.entityId] ?? metric.groupBy.entityId}
                        </span>
                        <span className="text-muted-foreground">·</span>
                        <code className="bg-muted px-1 rounded text-[10px]">
                          {metric.groupBy.attribute}
                        </code>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 flex-wrap">
                      {metric.steps.length > 0 && (
                        <>
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: ENTITY_COLORS[metric.steps[0].fromEntityId],
                              color: ENTITY_COLORS[metric.steps[0].fromEntityId],
                            }}
                          >
                            {metric.steps[0].fromEntity}
                          </Badge>
                          {metric.steps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
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
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {metric.filters && metric.filters.length > 0 ? (
                      <div className="space-y-1">
                        {metric.filters.map((f, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs">
                            <Filter className="w-3 h-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{f.attributeDisplay || f.attribute}</span>
                            <span className="font-mono text-[10px]">{f.operator}</span>
                            <code className="bg-muted px-1 rounded text-[10px]">
                              {Array.isArray(f.value) ? f.value.join(", ") : f.value}
                            </code>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-code text-code-foreground px-2 py-1 rounded">
                      {metric.metricKey}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveMetric(metric.id)}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Card>
  );
};
