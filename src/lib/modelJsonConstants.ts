// Fixed skeleton from model.json — entity UIDs, relations, and observations structure.
// These never change; only additional_attributes are generated dynamically.

export const ENTITY_UIDS: Record<string, string> = {
  biological_being: "91dc424b-af92-44a3-9b25-8c538e22e9dc",
  case:             "3c728ca6-66a6-4184-b37f-b28faa9265ce",
  specimen:         "b1e71da2-c235-401f-ae6b-42e8b32fd5b9",
  block:            "cf80a5f5-6ffe-44c4-bfc3-79c8861cf6e3",
  slide:            "dfe52a7f-cf95-4075-ab6e-d692f4a8cf39",
  image:            "21727f56-e6a9-47c0-80db-2561b60f777a",
};

export const BIOLOGICAL_BEING_RELATIONS = {
  case: {
    uid: "71b5f777-9713-42f1-be98-162cfd14578d",
    name: "Cases",
    description: null,
    parent_uid: "91dc424b-af92-44a3-9b25-8c538e22e9dc",
    child_uid: "3c728ca6-66a6-4184-b37f-b28faa9265ce",
    min_parents: 1,
    max_parents: 1,
    min_children: 1,
    max_children: null,
    parent_title: "Biological being",
    child_title: "Cases",
  },
  specimen: {
    uid: "d75fee0f-5b9d-41f5-b2ed-d3c89fcbd925",
    name: "Specimens",
    description: null,
    parent_uid: "91dc424b-af92-44a3-9b25-8c538e22e9dc",
    child_uid: "b1e71da2-c235-401f-ae6b-42e8b32fd5b9",
    min_parents: 1,
    max_parents: 1,
    min_children: 1,
    max_children: null,
    parent_title: "Biological being",
    child_title: "Specimens",
  },
};

export const SPECIMEN_RELATIONS = {
  block: {
    uid: "2702fc6b-6ac5-4191-8230-82d976815ebb",
    name: "Sampling to block",
    description: null,
    parent_uid: "b1e71da2-c235-401f-ae6b-42e8b32fd5b9",
    child_uid: "cf80a5f5-6ffe-44c4-bfc3-79c8861cf6e3",
    min_parents: 1,
    max_parents: 1,
    min_children: 1,
    max_children: null,
    parent_title: "Specimen",
    child_title: "Blocks",
  },
  biological_being: {
    uid: "d75fee0f-5b9d-41f5-b2ed-d3c89fcbd925",
    name: "Specimens",
    description: null,
    parent_uid: "91dc424b-af92-44a3-9b25-8c538e22e9dc",
    child_uid: "b1e71da2-c235-401f-ae6b-42e8b32fd5b9",
    min_parents: 1,
    max_parents: 1,
    min_children: 1,
    max_children: null,
    parent_title: "Biological being",
    child_title: "Specimens",
  },
  case: {
    uid: "10f4f545-a72d-4143-9351-860bad02962e",
    name: "Part of case",
    description: null,
    parent_uid: "3c728ca6-66a6-4184-b37f-b28faa9265ce",
    child_uid: "b1e71da2-c235-401f-ae6b-42e8b32fd5b9",
    min_parents: null,
    max_parents: 1,
    min_children: 1,
    max_children: null,
    parent_title: "Case",
    child_title: "Specimens",
  },
};

export const BLOCK_RELATIONS = {
  slide: {
    uid: "be9b1f57-6e88-41f4-a670-3ebc65493c41",
    name: "Sampling to slide",
    description: null,
    parent_uid: "cf80a5f5-6ffe-44c4-bfc3-79c8861cf6e3",
    child_uid: "dfe52a7f-cf95-4075-ab6e-d692f4a8cf39",
    min_parents: 1,
    max_parents: 1,
    min_children: 1,
    max_children: null,
    parent_title: "Block",
    child_title: "Slides",
  },
  specimen: {
    uid: "2702fc6b-6ac5-4191-8230-82d976815ebb",
    name: "Sampling to block",
    description: null,
    parent_uid: "b1e71da2-c235-401f-ae6b-42e8b32fd5b9",
    child_uid: "cf80a5f5-6ffe-44c4-bfc3-79c8861cf6e3",
    min_parents: 1,
    max_parents: 1,
    min_children: 1,
    max_children: null,
    parent_title: "Specimen",
    child_title: "Blocks",
  },
};

export const IMAGE_RELATIONS = {
  sample: {
    uid: "7f6a1ee3-faf0-443f-a71a-ae258c34fd2c",
    name: "BpImage of slide",
    description: null,
    image_uid: "21727f56-e6a9-47c0-80db-2561b60f777a",
    sample_uid: "dfe52a7f-cf95-4075-ab6e-d692f4a8cf39",
    image_title: "WSI",
    sample_title: "Slide",
  },
};

export const OBSERVATIONS_SKELETON = [
  {
    uid: "ec4eae14-9847-4fcb-82c5-3035503a5040",
    name: "diagnose",
    display_name: "Observation",
    item: {
      uid: "ec4eae14-9847-4fcb-82c5-3035503a5041",
      name: "Observation on specimen",
      description: null,
      observation_title: "Observation",
      observation_uid: "ec4eae14-9847-4fcb-82c5-3035503a5040",
      sample_title: "Specimen",
      sample_uid: "b1e71da2-c235-401f-ae6b-42e8b32fd5b9",
    },
    statement: {
      uid: "ec4eae14-9847-4fcb-82c5-3035503a5042",
      name: "statement",
      display_name: "Statement",
      description: null,
      attributes: [
        {
          uid: "ec4eae14-9847-4fcb-82c5-3035503a5044",
          name: "observation-statement-diagnose",
          display_name: "Diagnose",
          tag: "diagnose",
          attribute_type: "code",
        },
        {
          uid: "ec4eae14-9847-4fcb-82c5-3035503a5046",
          name: "observation-statement-pT_classification",
          display_name: "pT-classification",
          tag: "pT_classification",
          attribute_type: "string",
        },
      ],
    },
    observation_type: "sample",
  },
];

// Which MSMDAD entity ids map to which model.json top-level key
export const SUPPORTED_ENTITIES: Record<string, string> = {
  biological_being_entity: "biological_being",
  specimen_entity: "specimen",
  block_entity: "block",
  image_entity: "image",
};
