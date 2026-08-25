import { Selection } from "@/types/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Download, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SelectionPanelProps {
  selections: Selection[];
  onRemoveSelection: (id: string) => void;
  onClearAll: () => void;
  onDownload: () => void;
  onPreview: () => void;
  onDownloadModelJson?: () => void;
}

export const SelectionPanel = ({
  selections,
  onRemoveSelection,
  onClearAll,
  onDownload,
  onPreview,
  onDownloadModelJson,
}: SelectionPanelProps) => {
  return (
    <Card className="h-full flex flex-col bg-background">
      <div className="p-4 border-b bg-muted/30 flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Current Selection</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-muted-foreground">
              {selections.length} {selections.length === 1 ? "attribute" : "attributes"} selected
            </p>
            {selections.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            disabled={selections.length === 0}
          >
            Preview JSON
          </Button>
          <Button
            size="sm"
            onClick={onDownload}
            disabled={selections.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>
      </div>
      {onDownloadModelJson && selections.length > 0 && (
        <div className="px-4 py-1 border-b bg-muted/10 flex items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">Also export as</span>
          <button
            onClick={onDownloadModelJson}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            model.json (SlideTap)
          </button>
        </div>
      )}
      <div className="flex-1 overflow-auto min-h-0">
        {selections.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <p>No attributes selected yet.</p>
            <p className="text-sm mt-2">
              Select entities or individual attributes from the left panel.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity</TableHead>
                <TableHead>Attribute</TableHead>
                <TableHead>Metric Key</TableHead>
                <TableHead>XML File</TableHead>
                <TableHead>MSMdad ID</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selections.map((selection) => (
                <TableRow key={selection.id}>
                  <TableCell>
                    <Badge variant="outline">{selection.entity}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{selection.attribute}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-code text-code-foreground px-2 py-1 rounded">
                      {selection.metricKey}
                    </code>
                  </TableCell>
                  <TableCell>
                    {selection.xmlFile && (
                      <code className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                        {selection.xmlFile}
                      </code>
                    )}
                  </TableCell>
                  <TableCell>
                    {selection.msmdadId && (
                      <code className="text-xs bg-code text-code-foreground px-2 py-1 rounded">
                        {selection.msmdadId}
                      </code>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveSelection(selection.id)}
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
