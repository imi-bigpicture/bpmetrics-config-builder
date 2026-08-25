import { describe, expect, it } from "vitest";
import { isRequiredForSubmission, EntityXsdRequirements } from "./xsdRequirements";

function reqsWith(elements: Record<string, number>): Map<string, EntityXsdRequirements> {
  const map = new Map<string, EntityXsdRequirements>();
  const elementMap = new Map(
    Object.entries(elements).map(([name, minOccurs]) => [
      name,
      { name, minOccurs, maxOccurs: 1 as const },
    ]),
  );
  map.set("SomeEntity", { elements: elementMap, attributes: new Map() });
  return map;
}

describe("isRequiredForSubmission", () => {
  it("is false when metaflex is empty or '-'", () => {
    expect(isRequiredForSubmission("", "TITLE", new Map())).toBe(false);
    expect(isRequiredForSubmission("-", "TITLE", new Map())).toBe(false);
  });

  it("ObjectType Attribute (entity id / alias) is required when ObjectType requirements exist", () => {
    const reqs = new Map<string, EntityXsdRequirements>();
    reqs.set("ObjectType", { elements: new Map(), attributes: new Map() });
    expect(
      isRequiredForSubmission("ObjectType Attribute “alias”", "dataset_id", reqs),
    ).toBe(true);
  });

  it("ObjectType Attribute is not required when no ObjectType requirements are registered", () => {
    expect(
      isRequiredForSubmission("ObjectType Attribute “alias”", "dataset_id", new Map()),
    ).toBe(false);
  });

  it("RefObjectType/ReferenceType is required only if the matching element has minOccurs >= 1", () => {
    const required = reqsWith({ DATASET_REF: 1 });
    const optional = reqsWith({ DATASET_REF: 0 });
    expect(isRequiredForSubmission("ReferenceType", "dataset_ref", required)).toBe(true);
    expect(isRequiredForSubmission("ReferenceType", "dataset_ref", optional)).toBe(false);
    expect(isRequiredForSubmission("RefObjectType", "unknown_ref", required)).toBe(false);
  });

  it("AttributeType variants (Set/String/Numeric/Measurement/Code) are always false here - required-ness for these comes from MSMdad's NA field instead", () => {
    const reqs = reqsWith({ SEX: 1 });
    expect(isRequiredForSubmission("StringAttributeType", "sex", reqs)).toBe(false);
    expect(isRequiredForSubmission("NumericAttributeType", "sex", reqs)).toBe(false);
    expect(isRequiredForSubmission("MeasurementAttributeType", "sex", reqs)).toBe(false);
    expect(isRequiredForSubmission("CodeAttributeType", "sex", reqs)).toBe(false);
    expect(isRequiredForSubmission("SetAttributeType", "sex", reqs)).toBe(false);
  });

  it("direct xs: types are required only if the matching element has minOccurs >= 1", () => {
    const required = reqsWith({ TITLE: 1 });
    const optional = reqsWith({ TITLE: 0 });
    expect(isRequiredForSubmission("xs:string", "title", required)).toBe(true);
    expect(isRequiredForSubmission("xs:string", "title", optional)).toBe(false);
    expect(isRequiredForSubmission("xs:string", "missing_field", required)).toBe(false);
  });

  it("defaults to not required for anything unrecognized", () => {
    expect(isRequiredForSubmission("SomeUnknownType", "field", reqsWith({ FIELD: 1 }))).toBe(
      false,
    );
  });
});
