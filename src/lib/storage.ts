import { isLanguage, type Language } from "../i18n/translations";
// localStorage can throw (private mode, blocked storage); the app must work without it.
const LANGUAGE_KEY = "dominos.language";

export function loadLanguage(): Language | undefined {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_KEY);
    return isLanguage(stored) ? stored : undefined;
  } catch {
    return undefined;
  }
}

export function saveLanguage(language: Language): void {
  try {
    window.localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // A convenience only.
  }
}
