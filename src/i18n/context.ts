import { createContext } from "react";
import type { Language, Localized, Translations } from "./translations";

export type LanguageContextValue = {
  language: Language;
  t: Translations;
  /** Resolves a config string given in every language to the current one. */
  l: (text: Localized) => string;
  setLanguage: (language: Language) => void;
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);
