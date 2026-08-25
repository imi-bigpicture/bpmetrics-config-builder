import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus } from "lucide-react";
import { SUPPORTED_FILTERS } from "@/lib/bpselectConstants";
import { BpselectAttributeFilter } from "@/types/bpselect";

interface Props {
  onAdd: (filter: BpselectAttributeFilter) => void;
}

export const BpselectFilterBuilder = ({ onAdd }: Props) => {
  const [selectedCombo, setSelectedCombo] = useState<string>("");
  const [values, setValues] = useState<string[]>([]);
  const [freeTextInput, setFreeTextInput] = useState("");

  const combo = SUPPORTED_FILTERS.find(
    (f) => `${f.entity}/${f.attribute}` === selectedCombo
  );

  const handleComboChange = (val: string) => {
    setSelectedCombo(val);
    setValues([]);
    setFreeTextInput("");
  };

  const addFreeTextValue = () => {
    const v = freeTextInput.trim();
    if (v && !values.includes(v)) {
      setValues([...values, v]);
    }
    setFreeTextInput("");
  };

  const toggleEnumValue = (v: string) => {
    setValues((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };

  const removeValue = (v: string) => {
    setValues((prev) => prev.filter((x) => x !== v));
  };

  const handleAdd = () => {
    if (!combo || values.length === 0) return;
    onAdd({ entity: combo.entity, attribute: combo.attribute, values });
    setSelectedCombo("");
    setValues([]);
    setFreeTextInput("");
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
      <p className="text-sm font-medium text-foreground">Add attribute filter</p>

      {/* Entity / attribute selector */}
      <Select value={selectedCombo} onValueChange={handleComboChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select entity / attribute…" />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_FILTERS.map((f) => (
            <SelectItem key={`${f.entity}/${f.attribute}`} value={`${f.entity}/${f.attribute}`}>
              {f.entity} / {f.attribute}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Values input — dropdown for controlled vocab, free text otherwise */}
      {combo && (
        <div className="space-y-2">
          {combo.values ? (
            <div className="flex flex-wrap gap-2">
              {combo.values.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggleEnumValue(v)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    values.includes(v)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder={`Enter ${combo.attribute} value…`}
                value={freeTextInput}
                onChange={(e) => setFreeTextInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addFreeTextValue()}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addFreeTextValue}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Current value tags */}
          {values.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {values.map((v) => (
                <Badge key={v} variant="secondary" className="gap-1 pr-1">
                  {v}
                  <button
                    type="button"
                    onClick={() => removeValue(v)}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      <Button
        type="button"
        size="sm"
        onClick={handleAdd}
        disabled={!combo || values.length === 0}
        className="w-full"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add filter
      </Button>
    </div>
  );
};
