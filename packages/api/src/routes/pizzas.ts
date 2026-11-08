import {
  createSavedPizzaSchema,
  updateSavedPizzaSchema,
  type SavedPizza,
  type Toppings,
} from "@dominos/shared";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { Hono } from "hono";
import type { Db } from "../db/client.ts";
import { ingredientGroups, ingredients, savedPizzas, savedPizzaToppings } from "../db/schema.ts";
import type { AppDeps, AppEnv } from "../http/env.ts";
import { ApiHttpError, readJson } from "../http/errors.ts";
import { idParam, notFound } from "../http/params.ts";
import { currentUser } from "../http/session.ts";
import { toIngredientGroup } from "./staff/ingredients.ts";

/** A person's saved pizzas, oldest first, toppings in menu order, archived toppings left out. */
async function pizzasOf(db: Db, userId: string, id?: string): Promise<SavedPizza[]> {
  const rows = await db
    .select()
    .from(savedPizzas)
    .where(and(eq(savedPizzas.userId, userId), id ? eq(savedPizzas.id, id) : undefined))
    .orderBy(asc(savedPizzas.createdAt));
  if (rows.length === 0) return [];
  const toppings = await db
    .select({
      pizzaId: savedPizzaToppings.pizzaId,
      id: ingredients.id,
      en: ingredients.nameEn,
      sv: ingredients.nameSv,
    })
    .from(savedPizzaToppings)
    .innerJoin(ingredients, eq(ingredients.id, savedPizzaToppings.ingredientId))
    .innerJoin(ingredientGroups, eq(ingredientGroups.id, ingredients.groupId))
    .where(
      and(
        inArray(
          savedPizzaToppings.pizzaId,
          rows.map((r) => r.id),
        ),
        isNull(ingredients.archivedAt),
      ),
    )
    .orderBy(asc(ingredientGroups.sort), asc(ingredients.sort), asc(ingredients.createdAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    ingredients: toppings
      .filter((t) => t.pizzaId === r.id)
      .map((t) => ({ id: t.id, name: { en: t.en, sv: t.sv } })),
  }));
}

/** The toppings as given, without repeats, once it is known they are all still in the pantry. */
async function requireToppings(db: Db, given: string[]): Promise<string[]> {
  const ids = [...new Set(given)];
  if (ids.length === 0) return ids;
  const found = await db
    .select({ id: ingredients.id })
    .from(ingredients)
    .where(and(inArray(ingredients.id, ids), isNull(ingredients.archivedAt)));
  if (found.length !== ids.length) {
    throw new ApiHttpError(400, "validation_failed", "Unknown topping on the pizza.");
  }
  return ids;
}

async function replaceToppings(tx: Db, pizzaId: string, ids: string[]) {
  await tx.delete(savedPizzaToppings).where(eq(savedPizzaToppings.pizzaId, pizzaId));
  if (ids.length) {
    await tx
      .insert(savedPizzaToppings)
      .values(ids.map((ingredientId) => ({ pizzaId, ingredientId })));
  }
}

/** A person's own saved pizzas. Mounted behind sign-in; nobody else's can be seen or changed. */
export function pizzaRoutes(deps: AppDeps) {
  const { db } = deps;
  const routes = new Hono<AppEnv>();

  routes.get("/", async (c) => c.json(await pizzasOf(db, currentUser(c).id)));

  /** Everything a pizza can be made of, whichever event it ends up being ordered for. */
  routes.get("/toppings", async (c) => {
    const [groups, items] = await Promise.all([
      db
        .select()
        .from(ingredientGroups)
        .orderBy(asc(ingredientGroups.sort), asc(ingredientGroups.createdAt)),
      db
        .select()
        .from(ingredients)
        .where(isNull(ingredients.archivedAt))
        .orderBy(asc(ingredients.sort), asc(ingredients.createdAt)),
    ]);
    const body: Toppings = {
      groups: groups.map(toIngredientGroup),
      items: items.map((i) => ({
        id: i.id,
        groupId: i.groupId,
        name: { en: i.nameEn, sv: i.nameSv },
        emoji: i.emoji,
      })),
    };
    return c.json(body);
  });

  routes.post("/", async (c) => {
    const user = currentUser(c);
    const { name, ingredientIds } = await readJson(c, createSavedPizzaSchema);
    const ids = await requireToppings(db, ingredientIds);
    const id = await db.transaction(async (tx) => {
      const [pizza] = await tx
        .insert(savedPizzas)
        .values({ userId: user.id, name })
        .returning({ id: savedPizzas.id });
      await replaceToppings(tx, pizza!.id, ids);
      return pizza!.id;
    });
    const [created] = await pizzasOf(db, user.id, id);
    return c.json(created!, 201);
  });

  routes.patch("/:id", async (c) => {
    const user = currentUser(c);
    const id = idParam(c);
    const { name, ingredientIds } = await readJson(c, updateSavedPizzaSchema);
    if ((await pizzasOf(db, user.id, id)).length === 0) throw notFound("That pizza");
    const ids = ingredientIds && (await requireToppings(db, ingredientIds));
    await db.transaction(async (tx) => {
      if (name !== undefined) {
        await tx.update(savedPizzas).set({ name }).where(eq(savedPizzas.id, id));
      }
      if (ids) await replaceToppings(tx, id, ids);
    });
    const [updated] = await pizzasOf(db, user.id, id);
    return c.json(updated!);
  });

  routes.delete("/:id", async (c) => {
    const deleted = await db
      .delete(savedPizzas)
      .where(and(eq(savedPizzas.id, idParam(c)), eq(savedPizzas.userId, currentUser(c).id)))
      .returning({ id: savedPizzas.id });
    if (!deleted.length) throw notFound("That pizza");
    return c.body(null, 204);
  });

  return routes;
}
