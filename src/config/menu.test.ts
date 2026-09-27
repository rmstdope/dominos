import { describe, expect, it } from "vitest";
import rawMenu from "../../config/menu.json";
import { MenuConfigError, groupToppings, menu, parseMenu } from "./menu";

const valid = {
  recipient: { name: "Baker", whatsappNumber: "46701234567" },
  toppings: [
    {
      id: "cheese",
      name: { en: "Cheese", sv: "Ost" },
      emoji: "🧀",
      group: { en: "Cheese", sv: "Ost" },
    },
    {
      id: "ham",
      name: { en: "Ham", sv: "Skinka" },
      emoji: "🍖",
      group: { en: "Meat", sv: "Kött" },
    },
  ],
};

describe("the committed config/menu.json", () => {
  it("is valid", () => {
    expect(() => parseMenu(rawMenu)).not.toThrow();
    expect(menu.toppings.length).toBeGreaterThan(0);
    expect(menu.recipient.whatsappNumber).toMatch(/^\d+$/);
  });

  it("names every topping and group in both languages", () => {
    for (const topping of menu.toppings) {
      expect(topping.name.en, topping.id).not.toBe("");
      expect(topping.name.sv, topping.id).not.toBe("");
      expect(topping.group.en, topping.id).not.toBe("");
      expect(topping.group.sv, topping.id).not.toBe("");
    }
  });
});

describe("parseMenu", () => {
  it("returns a typed menu and trims whitespace", () => {
    const parsed = parseMenu({
      ...valid,
      recipient: { name: "  Baker ", whatsappNumber: "46701234567" },
      maxToppings: 4,
    });
    expect(parsed.recipient).toEqual({ name: "Baker", whatsappNumber: "46701234567" });
    expect(parsed.toppings).toHaveLength(2);
    expect(parsed.maxToppings).toBe(4);
  });

  it("leaves maxToppings undefined when not configured", () => {
    expect(parseMenu(valid).maxToppings).toBeUndefined();
  });

  it.each([
    ["not an object", null, /must be an object/],
    ["missing recipient", { toppings: valid.toppings }, /recipient must be an object/],
    [
      "empty recipient name",
      { ...valid, recipient: { name: " ", whatsappNumber: "46701234567" } },
      /recipient\.name/,
    ],
    [
      "number with plus sign",
      { ...valid, recipient: { name: "B", whatsappNumber: "+46701234567" } },
      /whatsappNumber/,
    ],
    [
      "number with spaces",
      { ...valid, recipient: { name: "B", whatsappNumber: "46 70 123" } },
      /whatsappNumber/,
    ],
    [
      "number too short",
      { ...valid, recipient: { name: "B", whatsappNumber: "12345" } },
      /whatsappNumber/,
    ],
    ["no toppings", { ...valid, toppings: [] }, /toppings must be a non-empty array/],
    [
      "topping not an object",
      { ...valid, toppings: ["cheese"] },
      /toppings\[0\] must be an object/,
    ],
    [
      "topping missing name",
      { ...valid, toppings: [{ id: "x", emoji: "x", group: { en: "g", sv: "g" } }] },
      /toppings\[0\]\.name must be an object with one entry per language/,
    ],
    [
      "topping name in one language only",
      {
        ...valid,
        toppings: [{ id: "x", name: { en: "X" }, emoji: "x", group: { en: "g", sv: "g" } }],
      },
      /toppings\[0\]\.name\.sv must be a non-empty string/,
    ],
    [
      "topping name as a plain string",
      { ...valid, toppings: [{ id: "x", name: "X", emoji: "x", group: { en: "g", sv: "g" } }] },
      /toppings\[0\]\.name must be an object/,
    ],
    [
      "group missing swedish",
      {
        ...valid,
        toppings: [
          { id: "x", name: { en: "X", sv: "X" }, emoji: "x", group: { en: "g", sv: " " } },
        ],
      },
      /toppings\[0\]\.group\.sv/,
    ],
    [
      "topping id with uppercase",
      {
        ...valid,
        toppings: [
          { id: "Cheese", name: { en: "C", sv: "C" }, emoji: "x", group: { en: "g", sv: "g" } },
        ],
      },
      /toppings\[0\]\.id/,
    ],
    [
      "duplicate topping ids",
      { ...valid, toppings: [valid.toppings[0], valid.toppings[0]] },
      /duplicate topping id "cheese"/,
    ],
    ["maxToppings zero", { ...valid, maxToppings: 0 }, /maxToppings/],
    ["maxToppings fractional", { ...valid, maxToppings: 2.5 }, /maxToppings/],
  ])("rejects %s", (_label, input, message) => {
    expect(() => parseMenu(input)).toThrow(MenuConfigError);
    expect(() => parseMenu(input)).toThrow(message);
  });
});

describe("groupToppings", () => {
  it("groups toppings preserving first-seen group order", () => {
    const veg = { en: "Veg", sv: "Grönt" };
    const meat = { en: "Meat", sv: "Kött" };
    const grouped = groupToppings([
      { id: "a", name: { en: "A", sv: "A" }, emoji: "", group: veg },
      { id: "b", name: { en: "B", sv: "B" }, emoji: "", group: meat },
      { id: "c", name: { en: "C", sv: "C" }, emoji: "", group: veg },
    ]);
    expect(grouped.map((g) => g.group)).toEqual([veg, meat]);
    expect(grouped[0]?.toppings.map((t) => t.id)).toEqual(["a", "c"]);
    expect(grouped[1]?.toppings.map((t) => t.id)).toEqual(["b"]);
  });
});
