import { describe, expect, it } from "vitest";
import rawMenu from "../../config/menu.json";
import { MenuConfigError, groupToppings, menu, parseMenu } from "./menu";

const valid = {
  recipient: { name: "Baker", whatsappNumber: "46701234567" },
  toppings: [
    { id: "cheese", name: "Cheese", emoji: "🧀", group: "Cheese" },
    { id: "ham", name: "Ham", emoji: "🍖", group: "Meat" },
  ],
};

describe("the committed config/menu.json", () => {
  it("is valid", () => {
    expect(() => parseMenu(rawMenu)).not.toThrow();
    expect(menu.toppings.length).toBeGreaterThan(0);
    expect(menu.recipient.whatsappNumber).toMatch(/^\d+$/);
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
      { ...valid, toppings: [{ id: "x", emoji: "x", group: "g" }] },
      /toppings\[0\]\.name/,
    ],
    [
      "topping id with uppercase",
      { ...valid, toppings: [{ id: "Cheese", name: "C", emoji: "x", group: "g" }] },
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
    const grouped = groupToppings([
      { id: "a", name: "A", emoji: "", group: "Veg" },
      { id: "b", name: "B", emoji: "", group: "Meat" },
      { id: "c", name: "C", emoji: "", group: "Veg" },
    ]);
    expect(grouped.map((g) => g.group)).toEqual(["Veg", "Meat"]);
    expect(grouped[0]?.toppings.map((t) => t.id)).toEqual(["a", "c"]);
    expect(grouped[1]?.toppings.map((t) => t.id)).toEqual(["b"]);
  });
});
