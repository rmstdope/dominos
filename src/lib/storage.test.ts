import { afterEach, describe, expect, it, vi } from "vitest";
import { loadLanguage, saveLanguage } from "./storage";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
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
