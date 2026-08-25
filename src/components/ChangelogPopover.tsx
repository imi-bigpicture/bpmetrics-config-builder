import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Add a new entry here whenever a meaningful change ships.
// Keep versions in descending order (newest first).
const CHANGELOG: {
  version: string;
  date: string;
  label?: "new" | "improvement" | "fix";
  entries: string[];
}[] = [
  {
    version: "v0.6",
    date: "2026-06-18",
    label: "new",
    entries: [
      "model.json export — generates a schema registration file from the current selection, with deterministic UUIDs per attribute. Covers biological_being, specimen, block, and image entities.",
    ],
  },
  {
    version: "v0.5",
    date: "2026-06-09",
    entries: [
      "bpselect Config Builder — new page (/bpselect) for building SelectionConfig JSONs consumable directly by bpselect. Dataset type constrained to 5 canonical values; attribute filters constrained to the 7 supported (entity, attribute) pairs; sex and treatment use controlled-vocab dropdowns.",
    ],
  },
  {
    version: "v0.4",
    date: "2026-05-22",
    entries: [
      "Slidetap minimum button — one click selects all MSMdad-required attributes on biological_being, case, specimen, block, slide, and image.",
    ],
  },
  {
    version: "v0.3",
    date: "2026-04-15",
    entries: [
      "groupBy field on compound metrics — DISTRIBUTION can group by an entity attribute (species, sex, etc.) instead of counting by alias.",
      "DISTINCT_COUNT requires a fully specified groupBy before the metric can be added.",
      "Group By column added to the Selected Connection Paths table.",
      "Known bpmetrics-resolvable attributes exposed in the UI: species, sex, control_terminology, anatomical_site, stain_code, diagnosis.",
    ],
  },
  {
    version: "v0.2",
    date: "2026-04-10",
    entries: [
      "Filter conditions on compound metrics — scope any path by entity attribute value.",
      "Filter UI in the Metric Builder tab's expanded path panel.",
      "Filters are included in the exported JSON config.",
    ],
  },
  {
    version: "v0.1",
    date: "2026-04-01",
    entries: [
      "Initial release.",
      "Schema Explorer: browse MSMdad entities and select attributes for extraction.",
      "Connection Explorer: traverse entity relationships and build compound metrics.",
      "Reference Graph: visualize all entity-to-entity reference edges.",
      "JSON config export for the bpmetrics extraction tool.",
    ],
  },
];

const LABEL_STYLES: Record<string, string> = {
  new:         "bg-primary/10 text-primary border-primary/30",
  improvement: "bg-amber-500/10 text-amber-600 border-amber-400/30",
  fix:         "bg-red-500/10 text-red-600 border-red-400/30",
};

const CURRENT_VERSION = CHANGELOG[0].version;

export const ChangelogPopover = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* Inline version badge — sits next to the app title, opens changelog on click */}
        <button className="text-[11px] font-medium text-muted-foreground border border-border rounded px-1.5 py-0.5 hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
          {CURRENT_VERSION}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-96 p-0">
        <div className="px-4 pt-4 pb-3 border-b">
          <p className="font-semibold text-sm">What's New</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Release history for bpmetrics Config Builder
          </p>
        </div>

        <ScrollArea className="h-80">
          <div className="p-4 space-y-5">
            {CHANGELOG.map((release) => (
              <div key={release.version}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm">{release.version}</span>
                  {release.label && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${LABEL_STYLES[release.label]}`}
                    >
                      {release.label}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {release.date}
                  </span>
                </div>

                <ul className="space-y-1.5">
                  {release.entries.map((entry, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                      {entry}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
