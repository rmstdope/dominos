import { readFileSync } from "node:fs";
import type { Ingredient, IngredientGroup } from "@dominos/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { importMenu } from "./import-menu.ts";
import { Harness } from "./test/harness.ts";

const t = new Harness();
const menu = JSON.parse(
  readFileSync(new URL("../../../config/menu.json", import.meta.url), "utf8"),
) as { toppings: { name: { en: string; sv: string }; group: { en: string } }[] };

beforeAll(() => t.start());
afterAll(() => t.database.close());
beforeEach(() => t.reset());

describe("importing the WhatsApp app's menu", () => {
  it("fills the pantry with every topping in its group, in menu order", async () => {
    const added = await importMenu(t.db, menu);
    const groupNames = [...new Set(menu.toppings.map((m) => m.group.en))];
    expect(added).toEqual({ groups: groupNames.length, ingredients: menu.toppings.length });

    const { browser } = await t.signedIn("staff");
    const groups = await browser.json<IngredientGroup[]>("GET", "/api/staff/ingredient-groups");
    expect(groups.map((g) => g.name.en)).toEqual(groupNames);
    const pantry = await browser.json<Ingredient[]>("GET", "/api/staff/ingredients");
    const first = menu.toppings[0]!;
    expect(pantry).toContainEqual(
      expect.objectContaining({ name: first.name, inStock: true, archived: false }),
    );
    for (const group of groups) {
      const inMenu = menu.toppings
        .filter((m) => m.group.en === group.name.en)
        .map((m) => m.name.en);
      const inPantry = pantry
        .filter((i) => i.groupId === group.id)
        .sort((a, b) => a.sort - b.sort)
        .map((i) => i.name.en);
      expect(inPantry).toEqual(inMenu);
    }
  });

  it("changes nothing the second time", async () => {
    await importMenu(t.db, menu);
    expect(await importMenu(t.db, menu)).toEqual({ groups: 0, ingredients: 0 });
  });

  it("refuses a file that is not a menu", async () => {
    await expect(importMenu(t.db, { toppings: [{ name: "Ham" }] })).rejects.toThrow();
  });
});
