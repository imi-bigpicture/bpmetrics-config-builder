import { useState, useMemo } from "react";
import { Attribute } from "@/types/schema";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AttributeTableProps {
  entityName: string;
  attributes: Attribute[];
  selectedAttributes: Set<string>;
  onToggleAttribute: (attributeId: string) => void;
  onToggleManyAttributes?: (attributeIds: string[], select: boolean) => void;
  onSelectSlidetapMinimum?: () => void;
}

export const AttributeTable = ({
  entityName,
  attributes,
  selectedAttributes,
  onToggleAttribute,
  onToggleManyAttributes,
  onSelectSlidetapMinimum,
}: AttributeTableProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [requiredFilter, setRequiredFilter] = useState<string>("all");
  const [naStatusFilter, setNaStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Get unique types and NA statuses for filter options
  const uniqueTypes = useMemo(() => {
    const types = new Set(attributes.map((attr) => attr.type));
    return Array.from(types).sort();
  }, [attributes]);

  const uniqueNaStatuses = useMemo(() => {
    const statuses = new Set(
      attributes.map((attr) => attr.naStatus).filter(Boolean) as string[]
    );
    return Array.from(statuses).sort();
  }, [attributes]);

  // Filter attributes based on search and filters
  const filteredAttributes = useMemo(() => {
    return attributes.filter((attr) => {
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          attr.name.toLowerCase().includes(query) ||
          (attr.displayName && attr.displayName.toLowerCase().includes(query)) ||
          (attr.description && attr.description.toLowerCase().includes(query)) ||
          attr.type.toLowerCase().includes(query) ||
          (attr.msmdadId && attr.msmdadId.toLowerCase().includes(query)) ||
          (attr.xpath && attr.xpath.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Required filter
      if (requiredFilter !== "all") {
        if (requiredFilter === "required" && !attr.required) return false;
        if (requiredFilter === "optional" && attr.required) return false;
      }

      // NA Status filter
      if (naStatusFilter !== "all") {
        if (!attr.naStatus || attr.naStatus !== naStatusFilter) return false;
      }

      // Type filter
      if (typeFilter !== "all") {
        if (attr.type !== typeFilter) return false;
      }

      return true;
    });
  }, [attributes, searchQuery, requiredFilter, naStatusFilter, typeFilter]);

  const hasActiveFilters =
    searchQuery || requiredFilter !== "all" || naStatusFilter !== "all" || typeFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setRequiredFilter("all");
    setNaStatusFilter("all");
    setTypeFilter("all");
  };

  return (
    <Card className="h-full overflow-auto bg-background flex flex-col">
      <div className="p-4 border-b bg-muted/30 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{entityName} Attributes</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredAttributes.length} of {attributes.length} attributes
              {hasActiveFilters && " (filtered)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onSelectSlidetapMinimum && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectSlidetapMinimum}
                className="gap-1 text-muted-foreground hover:text-foreground"
                title="Select all MSMdad-required attributes across all entities (SlideTap minimum)"
              >
                <Sparkles className="w-4 h-4" />
                Slidetap min
              </Button>
            )}
            {filteredAttributes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const ids = filteredAttributes.map((a) => a.id);
                  const allSelected = ids.every((id) => selectedAttributes.has(id));
                  if (onToggleManyAttributes) {
                    onToggleManyAttributes(ids, !allSelected);
                  } else {
                    ids.forEach((id) => {
                      const isSel = selectedAttributes.has(id);
                      if (allSelected ? isSel : !isSel) onToggleAttribute(id);
                    });
                  }
                }}
              >
                {filteredAttributes.every((a) => selectedAttributes.has(a.id))
                  ? "Deselect all"
                  : `Select all${hasActiveFilters ? " filtered" : ""}`}
              </Button>
            )}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="w-4 h-4" />
                Clear filters
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-wrap gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search attributes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Required Filter */}
          <Select value={requiredFilter} onValueChange={setRequiredFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Required" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="required">Required</SelectItem>
              <SelectItem value="optional">Optional</SelectItem>
            </SelectContent>
          </Select>

          {/* NA Status Filter */}
          <Select value={naStatusFilter} onValueChange={setNaStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="NA Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All NA Status</SelectItem>
              {uniqueNaStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-auto flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>NA Status</TableHead>
              <TableHead>MSMdad ID</TableHead>
              <TableHead>XML File</TableHead>
              <TableHead className="min-w-[300px]">XPath</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAttributes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No attributes match your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredAttributes.map((attr) => (
                <TableRow key={attr.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Checkbox
                      checked={selectedAttributes.has(attr.id)}
                      onCheckedChange={() => onToggleAttribute(attr.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <div className="text-foreground">{attr.displayName || attr.name}</div>
                      {attr.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {attr.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {attr.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {attr.required ? (
                      <Badge variant="default" className="bg-accent">Required</Badge>
                    ) : (
                      <Badge variant="secondary">Optional</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {attr.naStatus && (
                      <Badge 
                        variant={attr.naStatus.toLowerCase().includes('not allowed') ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        {attr.naStatus}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {attr.msmdadId && (
                      <code className="text-xs bg-code text-code-foreground px-2 py-1 rounded">
                        {attr.msmdadId}
                      </code>
                    )}
                  </TableCell>
                  <TableCell>
                    {attr.xmlFile && (
                      <code className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                        {attr.xmlFile}
                      </code>
                    )}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded block break-all">
                      {attr.xpath}
                    </code>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
