import { useEffect, useMemo, useState, type ReactNode } from "react";
import { loadLanguage, saveLanguage } from "../lib/storage";
import { detectLanguage, translations, type Language } from "./translations";

import { LanguageContext, type LanguageContextValue } from "./context";

function initialLanguage(): Language {
  return (
    loadLanguage() ??
    detectLanguage(typeof navigator === "undefined" ? undefined : navigator.language)
  );
}

export function LanguageProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(() => initial ?? initialLanguage());
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      t: translations[language],
      l: (text) => text[language],
      setLanguage: (next) => {
        setLanguageState(next);
        saveLanguage(next);
      },
    }),
    [language],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
