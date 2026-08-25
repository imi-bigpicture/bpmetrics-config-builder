import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { safeGetJson, safeSetItem } from "./safeStorage";

function makeMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe("safeStorage", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeMemoryStorage());
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("safeSetItem + safeGetJson round-trips a value", () => {
    safeSetItem("k", JSON.stringify({ a: 1 }));
    expect(safeGetJson<{ a: number }>("k")).toEqual({ a: 1 });
  });

  it("safeGetJson returns null for a missing key", () => {
    expect(safeGetJson("missing")).toBeNull();
  });

  it("safeGetJson returns null and clears corrupted JSON instead of throwing", () => {
    localStorage.setItem("bad", "{not json");
    expect(safeGetJson("bad")).toBeNull();
    expect(localStorage.getItem("bad")).toBeNull();
  });

  it("safeSetItem returns false instead of throwing when storage.setItem throws", () => {
    vi.stubGlobal("localStorage", {
      ...makeMemoryStorage(),
      setItem: () => {
        throw new DOMException("QuotaExceededError");
      },
    });
    expect(() => safeSetItem("k", "v")).not.toThrow();
    expect(safeSetItem("k", "v")).toBe(false);
  });
});
