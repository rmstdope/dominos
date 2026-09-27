import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCustomerName, saveCustomerName } from "./storage";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("customer name storage", () => {
  it("returns an empty string when nothing is stored", () => {
    expect(loadCustomerName()).toBe("");
  });

  it("round-trips a trimmed name", () => {
    saveCustomerName("  Henrik ");
    expect(loadCustomerName()).toBe("Henrik");
  });

  it("forgets the name when saving a blank one", () => {
    saveCustomerName("Henrik");
    saveCustomerName("   ");
    expect(loadCustomerName()).toBe("");
  });

  it("survives storage that throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveCustomerName("Henrik")).not.toThrow();
    expect(loadCustomerName()).toBe("");
  });
});
