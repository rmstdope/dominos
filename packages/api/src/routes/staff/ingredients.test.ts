import type { ApiError, Ingredient, IngredientGroup } from "@dominos/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Harness, type Browser } from "../../test/harness.ts";

const t = new Harness();
let staff: Browser;

beforeAll(() => t.start());
afterAll(() => t.database.close());
beforeEach(async () => {
  await t.reset();
  staff = (await t.signedIn("staff")).browser;
});

const group = (en: string, sv: string) =>
  staff.json<IngredientGroup>("POST", "/api/staff/ingredient-groups", { name: { en, sv } }, 201);

const ingredient = (groupId: string, en: string, sv = en) =>
  staff.json<Ingredient>("POST", "/api/staff/ingredients", { groupId, name: { en, sv } }, 201);

describe("staff routes", () => {
  it("need someone signed in", async () => {
    const res = await t.browser().get("/api/staff/ingredients");
    expect(res.status).toBe(401);
  });

  it("are refused to customers", async () => {
    const { browser } = await t.signedIn("customer");
    for (const path of ["/api/staff/ingredients", "/api/staff/people", "/api/staff/events"]) {
      const res = await browser.get(path);
      expect(res.status).toBe(403);
      expect(((await res.json()) as ApiError).error.code).toBe("forbidden");
    }
  });
});

describe("ingredient groups", () => {
  it("are listed in the order they were added", async () => {
    await group("Meat", "Kött");
    await group("Veg", "Grönt");
    const groups = await staff.json<IngredientGroup[]>("GET", "/api/staff/ingredient-groups");
    expect(groups.map((g) => g.name.en)).toEqual(["Meat", "Veg"]);
    expect(groups.map((g) => g.sort)).toEqual([0, 1]);
  });

  it("can be renamed and reordered", async () => {
    const meat = await group("Meat", "Kött");
    await group("Veg", "Grönt");
    await staff.json("PATCH", `/api/staff/ingredient-groups/${meat.id}`, {
      name: { en: "Meats", sv: "Kött" },
      sort: 5,
    });
    const groups = await staff.json<IngredientGroup[]>("GET", "/api/staff/ingredient-groups");
    expect(groups.map((g) => g.name.en)).toEqual(["Veg", "Meats"]);
  });

  it("need a name in both languages", async () => {
    const res = await staff.post("/api/staff/ingredient-groups", { name: { en: "Meat", sv: " " } });
    expect(res.status).toBe(400);
  });

  it("can only be deleted when empty", async () => {
    const meat = await group("Meat", "Kött");
    await ingredient(meat.id, "Ham", "Skinka");
    expect((await staff.delete(`/api/staff/ingredient-groups/${meat.id}`)).status).toBe(409);

    const empty = await group("Extras", "Extra");
    expect((await staff.delete(`/api/staff/ingredient-groups/${empty.id}`)).status).toBe(204);
    expect((await staff.delete(`/api/staff/ingredient-groups/${empty.id}`)).status).toBe(404);
  });

  it("answer 404 for an id that is not one", async () => {
    expect((await staff.patch("/api/staff/ingredient-groups/nope", {})).status).toBe(404);
  });
});

describe("ingredients", () => {
  it("are added in stock, in their group", async () => {
    const meat = await group("Meat", "Kött");
    const ham = await ingredient(meat.id, "Ham", "Skinka");
    expect(ham).toMatchObject({
      groupId: meat.id,
      name: { en: "Ham", sv: "Skinka" },
      inStock: true,
      archived: false,
    });
  });

  it("need a group that exists", async () => {
    const res = await staff.post("/api/staff/ingredients", {
      groupId: "8f14e45f-ceea-467a-9575-1f2a3b4c5d6e",
      name: { en: "Ham", sv: "Skinka" },
    });
    expect(res.status).toBe(400);
  });

  it("can run out of stock and come back", async () => {
    const veg = await group("Veg", "Grönt");
    const olives = await ingredient(veg.id, "Green olives", "Gröna oliver");
    const out = await staff.json<Ingredient>("PATCH", `/api/staff/ingredients/${olives.id}`, {
      inStock: false,
    });
    expect(out.inStock).toBe(false);
  });

  it("leave the pantry when archived, but can be listed and restored", async () => {
    const veg = await group("Veg", "Grönt");
    const olives = await ingredient(veg.id, "Green olives");
    await ingredient(veg.id, "Onion");
    await staff.json("PATCH", `/api/staff/ingredients/${olives.id}`, { archived: true });

    const pantry = await staff.json<Ingredient[]>("GET", "/api/staff/ingredients");
    expect(pantry.map((i) => i.name.en)).toEqual(["Onion"]);
    const all = await staff.json<Ingredient[]>("GET", "/api/staff/ingredients?archived=include");
    expect(all.map((i) => i.name.en)).toEqual(["Green olives", "Onion"]);

    await staff.json("PATCH", `/api/staff/ingredients/${olives.id}`, { archived: false });
    expect(await staff.json<Ingredient[]>("GET", "/api/staff/ingredients")).toHaveLength(2);
  });

  it("can move to another group", async () => {
    const veg = await group("Veg", "Grönt");
    const extras = await group("Extras", "Extra");
    const basil = await ingredient(veg.id, "Basil");
    const moved = await staff.json<Ingredient>("PATCH", `/api/staff/ingredients/${basil.id}`, {
      groupId: extras.id,
    });
    expect(moved.groupId).toBe(extras.id);
  });

  it("can have an emoji, which can be changed and taken away", async () => {
    const veg = await group("Veg", "Grönt");
    const res = await staff.post("/api/staff/ingredients", {
      groupId: veg.id,
      name: { en: "Mushrooms", sv: "Champinjoner" },
      emoji: "🍄",
    });
    expect(res.status).toBe(201);
    const mushrooms = (await res.json()) as Ingredient;
    expect(mushrooms.emoji).toBe("🍄");

    const path = `/api/staff/ingredients/${mushrooms.id}`;
    expect((await staff.json<Ingredient>("PATCH", path, { emoji: "🟤" })).emoji).toBe("🟤");
    expect((await staff.json<Ingredient>("PATCH", path, { emoji: null })).emoji).toBeNull();
  });

  it("start without an emoji", async () => {
    const veg = await group("Veg", "Grönt");
    expect((await ingredient(veg.id, "Basil")).emoji).toBeNull();
  });

  it("are returned unchanged by an empty PATCH", async () => {
    const veg = await group("Veg", "Grönt");
    const basil = await ingredient(veg.id, "Basil");
    expect(await staff.json("PATCH", `/api/staff/ingredients/${basil.id}`, {})).toEqual(basil);
  });
});
