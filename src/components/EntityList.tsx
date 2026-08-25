import { Entity } from "@/types/schema";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronRight, Search } from "lucide-react";

interface EntityListProps {
  entities: Entity[];
  selectedEntity: string | null;
  onSelectEntity: (entityId: string) => void;
  selectedEntities: Set<string>;
  onToggleEntity: (entityId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  /** Shown in place of the list when `entities` is empty (e.g. schemas failed to load). */
  emptyMessage?: string;
}

export const EntityList = ({
  entities,
  selectedEntity,
  onSelectEntity,
  selectedEntities,
  onToggleEntity,
  searchQuery,
  onSearchChange,
  emptyMessage,
}: EntityListProps) => {
  return (
    <Card className="h-full overflow-auto">
      <div className="p-4 border-b bg-muted/30">
        <h2 className="text-lg font-semibold text-foreground">Entities</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Select entities or individual attributes
        </p>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search entities, attributes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="p-2">
        {entities.length === 0 && emptyMessage && (
          <p className="text-sm text-muted-foreground text-center px-2 py-6">{emptyMessage}</p>
        )}
        {entities.map((entity) => (
          <div
            key={entity.id}
            className={`
              group flex items-start gap-3 p-3 rounded-lg cursor-pointer
              transition-colors hover:bg-muted/50
              ${selectedEntity === entity.id ? "bg-muted" : ""}
            `}
            onClick={() => onSelectEntity(entity.id)}
          >
            <Checkbox
              checked={selectedEntities.has(entity.id)}
              onCheckedChange={() => onToggleEntity(entity.id)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-medium text-foreground">{entity.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {entity.attributes.length}
                </Badge>
              </div>
              {entity.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {entity.description}
                </p>
              )}
            </div>
            <ChevronRight 
              className={`
                w-5 h-5 text-muted-foreground transition-transform flex-shrink-0
                ${selectedEntity === entity.id ? "rotate-90" : ""}
              `}
            />
          </div>
        ))}
      </div>
    </Card>
  );
};
