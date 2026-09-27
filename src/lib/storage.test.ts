import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCustomerName, loadLanguage, saveCustomerName, saveLanguage } from "./storage";

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

describe("language storage", () => {
  it("returns undefined when nothing or garbage is stored", () => {
    expect(loadLanguage()).toBeUndefined();
    window.localStorage.setItem("dominos.language", "klingon");
    expect(loadLanguage()).toBeUndefined();
  });

  it("round-trips a supported language", () => {
    saveLanguage("sv");
    expect(loadLanguage()).toBe("sv");
  });

  it("survives storage that throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveLanguage("sv")).not.toThrow();
  });
});
