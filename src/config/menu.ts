import rawMenu from "../../config/menu.json";

export type Topping = {
  id: string;
  name: string;
  emoji: string;
  group: string;
};

export type Recipient = {
  name: string;
  whatsappNumber: string;
};

export type Menu = {
  recipient: Recipient;
  toppings: Topping[];
  /** Upper bound on toppings per pizza; undefined means no limit. */
  maxToppings?: number;
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

/**
 * Validates the raw JSON menu and returns a typed Menu. Throws a MenuConfigError naming the
 * offending field so a bad edit to config/menu.json fails the test suite with a readable message
 * rather than a broken screen.
 */
export function parseMenu(raw: unknown): Menu {
  if (!isRecord(raw)) throw new MenuConfigError("must be an object");

  if (!isRecord(raw.recipient)) throw new MenuConfigError("recipient must be an object");
  const recipientName = nonEmptyString(raw.recipient.name, "recipient.name");
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
      name: nonEmptyString(entry.name, `${where}.name`),
      emoji: nonEmptyString(entry.emoji, `${where}.emoji`),
      group: nonEmptyString(entry.group, `${where}.group`),
    };
  });

  let maxToppings: number | undefined;
  if (raw.maxToppings !== undefined) {
    if (!Number.isInteger(raw.maxToppings) || (raw.maxToppings as number) < 1) {
      throw new MenuConfigError("maxToppings must be a positive integer when set");
    }
    maxToppings = raw.maxToppings as number;
  }

  return { recipient: { name: recipientName, whatsappNumber }, toppings, maxToppings };
}

/** Toppings grouped in the order their groups first appear in the config. */
export function groupToppings(toppings: Topping[]): { group: string; toppings: Topping[] }[] {
  const groups: { group: string; toppings: Topping[] }[] = [];
  for (const topping of toppings) {
    let bucket = groups.find((g) => g.group === topping.group);
    if (!bucket) {
      bucket = { group: topping.group, toppings: [] };
      groups.push(bucket);
    }
    bucket.toppings.push(topping);
  }
  return groups;
}

export const menu: Menu = parseMenu(rawMenu);
