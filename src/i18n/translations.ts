export const LANGUAGES = ["en", "sv"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = { en: "English", sv: "Svenska" };

// The few strings shared by every screen; each part of the app keeps its own texts next to it.
const en = {
  appName: "Dominos",
  language: "Language",
};

export type Translations = typeof en;

const sv: Translations = {
  appName: "Dominos",
  language: "Språk",
};

export const translations: Record<Language, Translations> = { en, sv };

export const isLanguage = (value: unknown): value is Language =>
  typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);

/** Picks the language from a BCP 47 tag such as "sv-SE"; anything unknown falls back to English. */
export function detectLanguage(locale: string | undefined): Language {
  const primary = locale?.toLowerCase().split("-")[0];
  return isLanguage(primary) ? primary : "en";
}
