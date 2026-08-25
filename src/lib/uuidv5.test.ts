import { describe, expect, it } from "vitest";
import { uuidv5 } from "./uuidv5";

describe("uuidv5", () => {
  it("is deterministic - same input always produces the same UUID", async () => {
    const a = await uuidv5("biological_being-sex");
    const b = await uuidv5("biological_being-sex");
    expect(a).toBe(b);
  });

  it("produces different UUIDs for different inputs", async () => {
    const a = await uuidv5("biological_being-sex");
    const b = await uuidv5("biological_being-treatment");
    expect(a).not.toBe(b);
  });

  it("produces a well-formed UUIDv5 string (version + variant nibbles set)", async () => {
    const id = await uuidv5("specimen-anatomical_site");
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("is sensitive to the exact string, not just its characters", async () => {
    // Same characters, different order/grouping - must not collide.
    const a = await uuidv5("ab-c");
    const b = await uuidv5("a-bc");
    expect(a).not.toBe(b);
  });
});
