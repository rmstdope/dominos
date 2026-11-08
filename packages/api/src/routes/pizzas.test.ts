import type { Ingredient, IngredientGroup, SavedPizza, Toppings } from "@dominos/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Harness, type Browser } from "../test/harness.ts";

const t = new Harness();
let staff: Browser;
let anna: Browser;
let ham: Ingredient;
let onion: Ingredient;

beforeAll(() => t.start());
afterAll(() => t.database.close());
beforeEach(async () => {
  await t.reset();
  staff = (await t.signedIn("staff", "baker@example.com")).browser;
  anna = (await t.signedIn("customer", "anna@example.com")).browser;
  const add = async (group: string, en: string) => {
    const g = await staff.json<IngredientGroup>(
      "POST",
      "/api/staff/ingredient-groups",
      { name: { en: group, sv: group } },
      201,
    );
    return staff.json<Ingredient>(
      "POST",
      "/api/staff/ingredients",
      { groupId: g.id, name: { en, sv: en } },
      201,
    );
  };
  ham = await add("Meat", "Ham");
  onion = await add("Veg", "Onion");
});

const create = (ingredientIds: string[], name = "The usual", who = anna) =>
  who.json<SavedPizza>("POST", "/api/me/pizzas", { name, ingredientIds }, 201);

describe("saved pizzas", () => {
  it("are named, listed oldest first, with toppings in menu order", async () => {
    const usual = await create([onion.id, ham.id]);
    expect(usual.name).toBe("The usual");
    expect(usual.ingredients.map((i) => i.name.en)).toEqual(["Ham", "Onion"]);
    await create([], "Plain");
    const all = await anna.json<SavedPizza[]>("GET", "/api/me/pizzas");
    expect(all.map((p) => p.name)).toEqual(["The usual", "Plain"]);
  });

  it("need a name, and toppings from the pantry", async () => {
    const post = (body: unknown) => anna.post("/api/me/pizzas", body);
    expect((await post({ name: "  ", ingredientIds: [] })).status).toBe(400);
    await staff.json("PATCH", `/api/staff/ingredients/${onion.id}`, { archived: true });
    expect((await post({ name: "Gone", ingredientIds: [onion.id] })).status).toBe(400);
  });

  it("can be renamed and get new toppings, separately", async () => {
    const pizza = await create([ham.id]);
    const path = `/api/me/pizzas/${pizza.id}`;
    const renamed = await anna.json<SavedPizza>("PATCH", path, { name: "Friday" });
    expect(renamed).toMatchObject({ name: "Friday", ingredients: [{ id: ham.id }] });
    const changed = await anna.json<SavedPizza>("PATCH", path, { ingredientIds: [onion.id] });
    expect(changed).toMatchObject({ name: "Friday", ingredients: [{ id: onion.id }] });
  });

  it("can be deleted", async () => {
    const pizza = await create([ham.id]);
    expect((await anna.delete(`/api/me/pizzas/${pizza.id}`)).status).toBe(204);
    expect(await anna.json<SavedPizza[]>("GET", "/api/me/pizzas")).toEqual([]);
    expect((await anna.delete(`/api/me/pizzas/${pizza.id}`)).status).toBe(404);
  });

  it("belong to the person who saved them", async () => {
    const pizza = await create([ham.id]);
    const path = `/api/me/pizzas/${pizza.id}`;
    const erik = (await t.signedIn("customer", "erik@example.com")).browser;
    expect(await erik.json<SavedPizza[]>("GET", "/api/me/pizzas")).toEqual([]);
    expect((await erik.patch(path, { name: "Mine now" })).status).toBe(404);
    expect((await erik.delete(path)).status).toBe(404);
    const [still] = await anna.json<SavedPizza[]>("GET", "/api/me/pizzas");
    expect(still?.name).toBe("The usual");
  });

  it("lose a topping that gets archived, and need signing in", async () => {
    await create([ham.id, onion.id]);
    await staff.json("PATCH", `/api/staff/ingredients/${onion.id}`, { archived: true });
    const [pizza] = await anna.json<SavedPizza[]>("GET", "/api/me/pizzas");
    expect(pizza?.ingredients.map((i) => i.name.en)).toEqual(["Ham"]);
    expect((await t.browser().get("/api/me/pizzas")).status).toBe(401);
  });

  it("can be made from anything still in the pantry", async () => {
    await staff.json("PATCH", `/api/staff/ingredients/${onion.id}`, { archived: true });
    const { groups, items } = await anna.json<Toppings>("GET", "/api/me/pizzas/toppings");
    expect(items.map((i) => i.name.en)).toEqual(["Ham"]);
    expect(groups.map((g) => g.name.en)).toEqual(["Meat", "Veg"]);
  });
});
