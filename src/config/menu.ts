import rawMenu from "../../config/menu.json";
import { LANGUAGES, type Localized } from "../i18n/translations";

export type Topping = {
  id: string;
  name: Localized;
  emoji: string;
  group: Localized;
};

export type Recipient = {
  name: Localized;
  whatsappNumber: string;
};

export type Menu = {
  recipient: Recipient;
  toppings: Topping[];
  /** Upper bound on toppings per pizza; undefined means no limit. */
  maxToppings?: number;
  /** Optional note shown above the toppings, e.g. what every pizza already includes. */
  note?: Localized;
};

export class MenuConfigError extends Error {
  constructor(message: string) {
    super(`config/menu.json: ${message}`);
    this.name = "MenuConfigError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nonEmptyString = (value: unknown, where: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new MenuConfigError(`${where} must be a non-empty string`);
  }
  return value.trim();
};

/** An object with a non-empty string for every supported language, e.g. { "en": "Ham", "sv": "Skinka" }. */
const localized = (value: unknown, where: string): Localized => {
  if (!isRecord(value)) {
    throw new MenuConfigError(
      `${where} must be an object with one entry per language: { ${LANGUAGES.map((l) => `"${l}": "..."`).join(", ")} }`,
    );
  }
  const out = {} as Localized;
  for (const language of LANGUAGES)
    out[language] = nonEmptyString(value[language], `${where}.${language}`);
  return out;
};

/**
 * Validates the raw JSON menu and returns a typed Menu. Throws a MenuConfigError naming the
 * offending field so a bad edit to config/menu.json fails the test suite with a readable message
 * rather than a broken screen.
 */
export function parseMenu(raw: unknown): Menu {
  if (!isRecord(raw)) throw new MenuConfigError("must be an object");

  if (!isRecord(raw.recipient)) throw new MenuConfigError("recipient must be an object");
  const recipientName = localized(raw.recipient.name, "recipient.name");
  const whatsappNumber = nonEmptyString(raw.recipient.whatsappNumber, "recipient.whatsappNumber");
  if (!/^[1-9]\d{6,14}$/.test(whatsappNumber)) {
    throw new MenuConfigError(
      "recipient.whatsappNumber must be digits only in international format without '+' or leading zeros, e.g. 46701234567",
    );
  }

  if (!Array.isArray(raw.toppings) || raw.toppings.length === 0) {
    throw new MenuConfigError("toppings must be a non-empty array");
  }
  const seen = new Set<string>();
  const toppings = raw.toppings.map((entry, index): Topping => {
    const where = `toppings[${index}]`;
    if (!isRecord(entry)) throw new MenuConfigError(`${where} must be an object`);
    const id = nonEmptyString(entry.id, `${where}.id`);
    if (!/^[a-z0-9-]+$/.test(id)) {
      throw new MenuConfigError(`${where}.id must be lowercase letters, digits and dashes`);
    }
    if (seen.has(id)) throw new MenuConfigError(`duplicate topping id "${id}"`);
    seen.add(id);
    return {
      id,
      name: localized(entry.name, `${where}.name`),
      emoji: nonEmptyString(entry.emoji, `${where}.emoji`),
      group: localized(entry.group, `${where}.group`),
    };
  });

  let maxToppings: number | undefined;
  if (raw.maxToppings !== undefined) {
    if (!Number.isInteger(raw.maxToppings) || (raw.maxToppings as number) < 1) {
      throw new MenuConfigError("maxToppings must be a positive integer when set");
    }
    maxToppings = raw.maxToppings as number;
  }

  const note = raw.note === undefined ? undefined : localized(raw.note, "note");

  return { recipient: { name: recipientName, whatsappNumber }, toppings, maxToppings, note };
}

/** Toppings grouped (by their English group name as key) in the order groups first appear in the config. */
export function groupToppings(toppings: Topping[]): { group: Localized; toppings: Topping[] }[] {
  const groups: { group: Localized; toppings: Topping[] }[] = [];
  for (const topping of toppings) {
    let bucket = groups.find((g) => g.group.en === topping.group.en);
    if (!bucket) {
      bucket = { group: topping.group, toppings: [] };
      groups.push(bucket);
    }
    bucket.toppings.push(topping);
  }
  return groups;
}

export const menu: Menu = parseMenu(rawMenu);
