import { describe, expect, it } from "vitest";
import { DATASET_TYPES, SUPPORTED_FILTERS } from "./bpselectConstants";

describe("bpselectConstants", () => {
  it("DATASET_TYPES has 5 canonical, non-empty, unique values", () => {
    expect(DATASET_TYPES.length).toBe(5);
    expect(new Set(DATASET_TYPES).size).toBe(DATASET_TYPES.length);
    for (const type of DATASET_TYPES) {
      expect(type.length).toBeGreaterThan(0);
    }
  });

  it("SUPPORTED_FILTERS has 7 pairs, each with a non-empty entity and attribute", () => {
    expect(SUPPORTED_FILTERS.length).toBe(7);
    for (const filter of SUPPORTED_FILTERS) {
      expect(filter.entity.length).toBeGreaterThan(0);
      expect(filter.attribute.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate (entity, attribute) pairs", () => {
    const keys = SUPPORTED_FILTERS.map((f) => `${f.entity}/${f.attribute}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("filters with a controlled vocabulary (`values`) are non-empty and unique", () => {
    for (const filter of SUPPORTED_FILTERS) {
      if (filter.values) {
        expect(filter.values.length).toBeGreaterThan(0);
        expect(new Set(filter.values).size).toBe(filter.values.length);
      }
    }
  });
});
