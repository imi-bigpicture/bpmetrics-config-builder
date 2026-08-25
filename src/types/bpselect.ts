// Mirror of bpselect's selection/config.go structs.
// LoadConfig enforces: version === 1, id non-empty, dataset_types length === 1,
// all attribute filters use supported (entity, attribute) pairs, values non-empty.

export interface BpselectAttributeFilter {
  entity: string;
  attribute: string;
  values: string[];
}

export interface BpselectConfig {
  version: 1;
  id: string;
  datasets?: string[];
  filters: {
    dataset_types: [string];
    attributes?: BpselectAttributeFilter[];
  };
  limit?: {
    max_images_per_dataset?: number;
    max_images_total?: number;
  };
}
