import type { Localized } from "@dominos/shared";
/** The entries that are not undefined, so a PATCH only touches the fields it was sent. */
export function definedOnly<T extends Record<string, unknown>>(values: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export const isEmpty = (values: object) => Object.keys(values).length === 0;

/** An event's name or place in both languages, from its English and Swedish columns. */
export const bothLanguages = (en: string, sv: string | null): Localized => ({ en, sv: sv ?? en });
