import { describe, expect, it } from "vitest";
import { generateXPathFromMetaflex, normalizeDataType } from "./xmlSchemaParser";

describe("generateXPathFromMetaflex", () => {
  it("falls back to /ENTITY/FIELD when metaflex is empty or '-'", () => {
    expect(generateXPathFromMetaflex("", "DATASET", "title")).toBe("/DATASET/TITLE");
    expect(generateXPathFromMetaflex("-", "DATASET", "title")).toBe("/DATASET/TITLE");
  });

  it("ObjectType Attribute maps to the entity's alias/accession", () => {
    expect(
      generateXPathFromMetaflex("ObjectType Attribute “alias” AND/OR “accession”", "DATASET", "dataset_id"),
    ).toBe("/DATASET/@alias | /DATASET/@accession");
  });

  it("RefObjectType/ReferenceType maps to a reference element's accession", () => {
    expect(generateXPathFromMetaflex("ReferenceType", "DATASET", "complements_datasets")).toBe(
      "/DATASET/COMPLEMENTS_DATASETS/@accession",
    );
  });

  it("each AttributeType variant maps into its own ATTRIBUTES container element", () => {
    expect(generateXPathFromMetaflex("StringAttributeType", "SPECIMEN", "anatomical_site")).toBe(
      "/SPECIMEN/ATTRIBUTES/STRING_ATTRIBUTE[TAG='anatomical_site']/VALUE",
    );
    expect(generateXPathFromMetaflex("NumericAttributeType", "IMAGE", "width")).toBe(
      "/IMAGE/ATTRIBUTES/NUMERIC_ATTRIBUTE[TAG='width']/VALUE",
    );
    expect(generateXPathFromMetaflex("MeasurementAttributeType", "IMAGE", "x")).toBe(
      "/IMAGE/ATTRIBUTES/MEASUREMENT_ATTRIBUTE[TAG='x']/VALUE",
    );
    expect(generateXPathFromMetaflex("CodeAttributeType", "BLOCK", "block_preparation")).toBe(
      "/BLOCK/ATTRIBUTES/CODE_ATTRIBUTE[TAG='block_preparation']/VALUE",
    );
  });

  it("direct xs: types map straight to an uppercased element under the entity", () => {
    expect(generateXPathFromMetaflex("xs:string", "DATASET", "description")).toBe(
      "/DATASET/DESCRIPTION",
    );
  });

  it("unrecognized metaflex values fall back to a direct element (same as empty case)", () => {
    expect(generateXPathFromMetaflex("SomethingNovel", "DATASET", "field")).toBe(
      "/DATASET/FIELD",
    );
  });
});

describe("normalizeDataType", () => {
  it("returns 'Unknown' for missing values", () => {
    expect(normalizeDataType(undefined)).toBe("Unknown");
    expect(normalizeDataType("")).toBe("Unknown");
    expect(normalizeDataType("   ")).toBe("Unknown");
  });

  it("returns 'Unknown' for known placeholder values regardless of case", () => {
    expect(normalizeDataType("TDB")).toBe("Unknown");
    expect(normalizeDataType("tdb")).toBe("Unknown");
    expect(normalizeDataType("STATEMENT")).toBe("Unknown");
  });

  it("folds every real 'string' spelling found in the MSMdad data to STRING", () => {
    for (const raw of ["STRING", "String", "STRING_ATTRIBUTE", "String ATTRIBUTE", "string ATTRIBUTE"]) {
      expect(normalizeDataType(raw)).toBe("STRING");
    }
  });

  it("folds every real 'set' spelling found in the MSMdad data to SET", () => {
    for (const raw of ["SET_ATTRIBUTE", "SET ATTRIBUTE", "ATTRIBUTE SET", "SET"]) {
      expect(normalizeDataType(raw)).toBe("SET");
    }
  });

  it("passes already-consistent values through unchanged", () => {
    expect(normalizeDataType("FLOAT")).toBe("FLOAT");
    expect(normalizeDataType("INT")).toBe("INT");
    expect(normalizeDataType("U-INT")).toBe("U-INT");
    expect(normalizeDataType("CODE ATTRIBUTE")).toBe("CODE ATTRIBUTE");
    expect(normalizeDataType("CODE ATTRIBUTE OR STRING")).toBe("CODE ATTRIBUTE OR STRING");
  });

  it("passes through an unrecognized value as-is (trimmed) rather than guessing", () => {
    expect(normalizeDataType("  SomeFutureType  ")).toBe("SomeFutureType");
  });
});
