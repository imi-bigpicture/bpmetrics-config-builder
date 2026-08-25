import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X } from "lucide-react";
import { BpselectAttributeFilter } from "@/types/bpselect";

interface Props {
  filters: BpselectAttributeFilter[];
  onRemove: (index: number) => void;
}

export const BpselectFilterList = ({ filters, onRemove }: Props) => {
  if (filters.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No filters added — all images in matching datasets will be selected.
      </p>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entity</TableHead>
            <TableHead>Attribute</TableHead>
            <TableHead>Values (OR)</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filters.map((f, i) => (
            <TableRow key={i}>
              <TableCell className="font-mono text-xs">{f.entity}</TableCell>
              <TableCell className="font-mono text-xs">{f.attribute}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {f.values.map((v) => (
                    <Badge key={v} variant="secondary" className="text-xs">
                      {v}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(i)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};
