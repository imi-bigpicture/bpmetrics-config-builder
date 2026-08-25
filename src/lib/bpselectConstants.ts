// Canonical dataset_types values from bpselect/metrics/policy.go.
export const DATASET_TYPES = [
  "Non-Clinical/Obscured",
  "Non-Clinical/Cryptonymised",
  "Clinical/Anonymized",
  "Clinical/Pseudonymized",
  "Clinical/Scrambled",
] as const;

// Supported (entity, attribute) filter pairs from bpselect/selection/filter.go.
// `values` is present only for attributes with a fixed controlled vocabulary;
// all others are free-text (open code systems or institution-specific).
// Keep in sync with attributeResolvers in filter.go when bpselect adds new pairs.
export const SUPPORTED_FILTERS: {
  entity: string;
  attribute: string;
  values?: readonly string[];
}[] = [
  {
    entity: "biological_being",
    attribute: "species",
    // SNOMED CT Organism / CDISC SEND — open, no fixed list
  },
  {
    entity: "biological_being",
    attribute: "sex",
    // MSMDAD Value_Specification controlled vocabulary
    values: ["Male", "Female", "Not-known", "Other"],
  },
  {
    entity: "biological_being",
    attribute: "treatment",
    // bpselect/metrics/sample.go normalises to exactly these three strings
    values: ["TREATED", "CONTROL", "UNKNOWN"],
  },
  {
    entity: "specimen",
    attribute: "anatomical_site",
    // SNOMED CT anatomy — open, no fixed list
  },
  {
    entity: "staining",
    attribute: "staining_code",
    // SNOMED CT code value — open, no fixed list
  },
  {
    entity: "observation",
    attribute: "diagnosis",
    // SNOMED CT meaning string — open, no fixed list
  },
  {
    entity: "organisation",
    attribute: "submitting_organization_pic",
    // Institution PIC — open, no fixed list
  },
];
