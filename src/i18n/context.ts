import { createContext } from "react";
import type { Language, Translations } from "./translations";

export type LanguageContextValue = {
  language: Language;
  t: Translations;
  setLanguage: (language: Language) => void;
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);
