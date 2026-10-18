import {
  createIngredientGroupSchema,
  createIngredientSchema,
  updateIngredientGroupSchema,
  updateIngredientSchema,
  type Ingredient,
  type IngredientGroup,
} from "@dominos/shared";
import { asc, eq, isNull, max } from "drizzle-orm";
import { Hono } from "hono";
import type { Db } from "../../db/client.ts";
import { definedOnly, isEmpty } from "../../db/util.ts";
import {
  ingredientGroups,
  ingredients,
  type IngredientGroupRow,
  type IngredientRow,
} from "../../db/schema.ts";
import type { AppDeps, AppEnv } from "../../http/env.ts";
import { ApiHttpError, readJson } from "../../http/errors.ts";
import { conflict, idParam, notFound } from "../../http/params.ts";

export const toIngredientGroup = (g: IngredientGroupRow): IngredientGroup => ({
  id: g.id,
  name: { en: g.nameEn, sv: g.nameSv },
  sort: g.sort,
});

export const toIngredient = (i: IngredientRow): Ingredient => ({
  id: i.id,
  groupId: i.groupId,
  name: { en: i.nameEn, sv: i.nameSv },
  inStock: i.inStock,
  sort: i.sort,
  archived: i.archivedAt !== null,
});

async function requireGroup(db: Db, id: string) {
  const [group] = await db.select().from(ingredientGroups).where(eq(ingredientGroups.id, id));
  if (!group) throw new ApiHttpError(400, "validation_failed", "No such ingredient group.");
  return group;
}

export function ingredientRoutes(deps: AppDeps) {
  const { db } = deps;
  const routes = new Hono<AppEnv>();

  routes.get("/ingredient-groups", async (c) => {
    const rows = await db
      .select()
      .from(ingredientGroups)
      .orderBy(asc(ingredientGroups.sort), asc(ingredientGroups.createdAt));
    return c.json(rows.map(toIngredientGroup));
  });

  routes.post("/ingredient-groups", async (c) => {
    const { name } = await readJson(c, createIngredientGroupSchema);
    const [{ last } = { last: null }] = await db
      .select({ last: max(ingredientGroups.sort) })
      .from(ingredientGroups);
    const [group] = await db
      .insert(ingredientGroups)
      .values({ nameEn: name.en, nameSv: name.sv, sort: (last ?? -1) + 1 })
      .returning();
    return c.json(toIngredientGroup(group!), 201);
  });

  routes.patch("/ingredient-groups/:id", async (c) => {
    const id = idParam(c);
    const { name, sort } = await readJson(c, updateIngredientGroupSchema);
    const changes = definedOnly({ nameEn: name?.en, nameSv: name?.sv, sort });
    const [group] = isEmpty(changes)
      ? await db.select().from(ingredientGroups).where(eq(ingredientGroups.id, id))
      : await db
          .update(ingredientGroups)
          .set(changes)
          .where(eq(ingredientGroups.id, id))
          .returning();
    if (!group) throw notFound("That group");
    return c.json(toIngredientGroup(group));
  });

  routes.delete("/ingredient-groups/:id", async (c) => {
    const id = idParam(c);
    const [used] = await db
      .select({ id: ingredients.id })
      .from(ingredients)
      .where(eq(ingredients.groupId, id))
      .limit(1);
    if (used) throw conflict("Move or remove the group's ingredients first.");
    const deleted = await db
      .delete(ingredientGroups)
      .where(eq(ingredientGroups.id, id))
      .returning({ id: ingredientGroups.id });
    if (!deleted.length) throw notFound("That group");
    return c.body(null, 204);
  });

  routes.get("/ingredients", async (c) => {
    const includeArchived = c.req.query("archived") === "include";
    const rows = await db
      .select()
      .from(ingredients)
      .where(includeArchived ? undefined : isNull(ingredients.archivedAt))
      .orderBy(asc(ingredients.sort), asc(ingredients.createdAt));
    return c.json(rows.map(toIngredient));
  });

  routes.post("/ingredients", async (c) => {
    const { groupId, name, inStock } = await readJson(c, createIngredientSchema);
    await requireGroup(db, groupId);
    const [{ last } = { last: null }] = await db
      .select({ last: max(ingredients.sort) })
      .from(ingredients)
      .where(eq(ingredients.groupId, groupId));
    const [ingredient] = await db
      .insert(ingredients)
      .values({ groupId, nameEn: name.en, nameSv: name.sv, inStock, sort: (last ?? -1) + 1 })
      .returning();
    return c.json(toIngredient(ingredient!), 201);
  });

  routes.patch("/ingredients/:id", async (c) => {
    const id = idParam(c);
    const { groupId, name, inStock, sort, archived } = await readJson(c, updateIngredientSchema);
    if (groupId) await requireGroup(db, groupId);
    const changes = definedOnly({
      groupId,
      nameEn: name?.en,
      nameSv: name?.sv,
      inStock,
      sort,
      archivedAt: archived === undefined ? undefined : archived ? deps.now() : null,
    });
    const [ingredient] = isEmpty(changes)
      ? await db.select().from(ingredients).where(eq(ingredients.id, id))
      : await db.update(ingredients).set(changes).where(eq(ingredients.id, id)).returning();
    if (!ingredient) throw notFound("That ingredient");
    return c.json(toIngredient(ingredient));
  });

  return routes;
}
