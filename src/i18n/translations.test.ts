import { describe, expect, it } from "vitest";
import { LANGUAGES, detectLanguage, isLanguage, translations } from "./translations";

describe("translations", () => {
  it("has every key in every language", () => {
    const keys = Object.keys(translations.en).sort();
    for (const language of LANGUAGES) {
      expect(Object.keys(translations[language]).sort()).toEqual(keys);
    }
  });

  it("has no empty strings", () => {
    for (const language of LANGUAGES) {
      for (const [key, value] of Object.entries(translations[language])) {
        const text = typeof value === "function" ? (value as (...a: never[]) => string)() : value;
        expect(text, `${language}.${key}`).not.toBe("");
      }
    }
  });
});

describe("detectLanguage", () => {
  it.each([
    ["sv-SE", "sv"],
    ["sv", "sv"],
    ["SV-FI", "sv"],
    ["en-GB", "en"],
    ["de-DE", "en"],
    [undefined, "en"],
  ])("maps %s to %s", (locale, expected) => {
    expect(detectLanguage(locale)).toBe(expected);
  });
});

describe("isLanguage", () => {
  it("accepts only supported codes", () => {
    expect(isLanguage("en")).toBe(true);
    expect(isLanguage("sv")).toBe(true);
    expect(isLanguage("no")).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
  });
});
