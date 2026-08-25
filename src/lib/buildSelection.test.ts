import { describe, expect, it } from "vitest";
import { buildSelection } from "./buildSelection";
import { Entity, Attribute } from "@/types/schema";

const entity: Entity = {
  id: "dataset",
  name: "Dataset",
  attributes: [],
};

const attribute: Attribute = {
  id: "dataset_title",
  name: "TITLE",
  displayName: "Title",
  type: "STRING",
  required: true,
  xpath: "/DATASET/TITLE",
  xmlFile: "dataset.xml",
  msmdadId: "1.1.2",
  description: "The title of the dataset.",
  entityId: "dataset",
};

describe("buildSelection", () => {
  it("produces the same shape regardless of caller (regression: this used to drift)", () => {
    const selection = buildSelection(entity, attribute);
    expect(selection).toEqual({
      id: "dataset_title",
      entity: "Dataset",
      attribute: "Title",
      xmlFile: "dataset.xml",
      xpath: "/DATASET/TITLE",
      msmdadId: "1.1.2",
      metricKey: "dataset_title",
    });
  });

  it("does not carry the attribute's description onto the Selection", () => {
    // Regression: one of the three previous call sites stray-included `description`,
    // which isn't part of the Selection type but still leaked into the downloaded
    // JSON since JSON.stringify ignores TS types.
    const selection = buildSelection(entity, attribute);
    expect(selection).not.toHaveProperty("description");
  });

  it("falls back to the machine-readable name when displayName is absent", () => {
    const noDisplayName: Attribute = { ...attribute, displayName: undefined };
    expect(buildSelection(entity, noDisplayName).attribute).toBe("TITLE");
  });
});
