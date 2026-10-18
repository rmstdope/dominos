/** The entries that are not undefined, so a PATCH only touches the fields it was sent. */
export function definedOnly<T extends Record<string, unknown>>(values: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export const isEmpty = (values: object) => Object.keys(values).length === 0;
