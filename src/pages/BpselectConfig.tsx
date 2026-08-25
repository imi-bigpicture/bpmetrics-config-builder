import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Eye, ArrowLeft, Filter, Info, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { BpselectFilterBuilder } from "@/components/BpselectFilterBuilder";
import { BpselectFilterList } from "@/components/BpselectFilterList";
import { JsonPreview } from "@/components/JsonPreview";
import { DATASET_TYPES } from "@/lib/bpselectConstants";
import { BpselectAttributeFilter, BpselectConfig } from "@/types/bpselect";

const BpselectConfigPage = () => {
  const [id, setId] = useState("");
  const [datasetType, setDatasetType] = useState<string>("");
  const [maxPerDataset, setMaxPerDataset] = useState<string>("");
  const [maxTotal, setMaxTotal] = useState<string>("");
  const [filters, setFilters] = useState<BpselectAttributeFilter[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const generateConfig = (): BpselectConfig => {
    const config: BpselectConfig = {
      version: 1,
      id: id.trim(),
      filters: {
        dataset_types: [datasetType] as [string],
        attributes: filters.length > 0 ? filters : undefined,
      },
    };

    const limitPerDataset = maxPerDataset ? parseInt(maxPerDataset, 10) : undefined;
    const limitTotal = maxTotal ? parseInt(maxTotal, 10) : undefined;
    if (limitPerDataset || limitTotal) {
      config.limit = {
        ...(limitPerDataset ? { max_images_per_dataset: limitPerDataset } : {}),
        ...(limitTotal ? { max_images_total: limitTotal } : {}),
      };
    }

    return config;
  };

  const idError = (() => {
    if (id.length === 0) return null; // no error while empty, just blocked
    if (id.length > 255) return "ID must be 255 characters or fewer";
    if (!/^[a-zA-Z0-9_-]+$/.test(id))
      return 'ID must contain only letters, digits, hyphens and underscores (e.g. sel-breast-human-2026)';
    return null;
  })();

  const isValid = id.trim().length > 0 && idError === null && datasetType.length > 0;

  const handleDownload = () => {
    const config = generateConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bpselect-config-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("bpselect config downloaded");
  };

  const handleAddFilter = (filter: BpselectAttributeFilter) => {
    setFilters((prev) => [...prev, filter]);
  };

  const handleRemoveFilter = (index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Link>
              </Button>
                <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-5 h-5 text-primary flex-shrink-0" />
                  <h1 className="text-lg sm:text-2xl font-bold text-foreground leading-tight">
                    bpselect Config Builder
                  </h1>
                  <Button variant="ghost" size="icon" asChild className="h-8 w-8" title="bpselect repository (private, requires imi-bigpicture org access)">
                    <a
                      href="https://github.com/imi-bigpicture/bpselect"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Build the SelectionConfig JSON that bpselect consumes to filter and select images from the archive — experimental, not deployed in production.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(true)}
                disabled={!isValid}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button size="sm" onClick={handleDownload} disabled={!isValid}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Disclaimer */}
      <div className="container mx-auto px-4 sm:px-6 pt-4 max-w-3xl">
        <Alert variant="default" className="bg-muted/50 text-muted-foreground border-border">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Originally created and authored by Emre Balsever, now contributed to the imi-bigpicture organization as an open-source tool. It is provided as-is; maintenance ownership is being transitioned within the Bigpicture project.
          </AlertDescription>
        </Alert>
      </div>

      {/* Main */}
      <div className="flex-1 container mx-auto px-4 sm:px-6 py-6 space-y-6 max-w-3xl">
        {/* Config basics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="config-id">ID *</Label>
              <Input
                id="config-id"
                placeholder="e.g. human-lung-hne-2024"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className={idError ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {idError ? (
                <p className="text-xs text-destructive">{idError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Unique identifier written into the output manifest header.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dataset-type">Dataset type *</Label>
              <Select value={datasetType} onValueChange={setDatasetType}>
                <SelectTrigger id="dataset-type">
                  <SelectValue placeholder="Select a dataset type…" />
                </SelectTrigger>
                <SelectContent>
                  {DATASET_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Exactly one value required. Datasets not matching this type are skipped entirely.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="max-per-dataset">Max images per dataset</Label>
                <Input
                  id="max-per-dataset"
                  type="number"
                  min={1}
                  placeholder="unlimited"
                  value={maxPerDataset}
                  onChange={(e) => setMaxPerDataset(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max-total">Max images total</Label>
                <Input
                  id="max-total"
                  type="number"
                  min={1}
                  placeholder="unlimited"
                  value={maxTotal}
                  onChange={(e) => setMaxTotal(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attribute filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attribute filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Filters are AND-ed across attributes; values within one filter are OR-ed.
              Only supported (entity, attribute) pairs are shown.
            </p>
            <BpselectFilterBuilder onAdd={handleAddFilter} />
            <BpselectFilterList filters={filters} onRemove={handleRemoveFilter} />
          </CardContent>
        </Card>
      </div>

      {showPreview && (
        <JsonPreview config={generateConfig()} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
};

export default BpselectConfigPage;
