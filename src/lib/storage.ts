import { isLanguage, type Language } from "../i18n/translations";
const NAME_KEY = "dominos.customerName";

// localStorage can throw (private mode, blocked storage); the app must work without it.
export function loadCustomerName(): string {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveCustomerName(name: string): void {
  try {
    if (name.trim() === "") window.localStorage.removeItem(NAME_KEY);
    else window.localStorage.setItem(NAME_KEY, name.trim());
  } catch {
    // Remembering the name is a convenience, not a requirement.
  }
}

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
