import {
  changePasswordSchema,
  setFavouriteSchema,
  updateMeSchema,
  type Favourite,
} from "@dominos/shared";
import { and, asc, eq, inArray, isNull, ne } from "drizzle-orm";
import { Hono } from "hono";
import { toMe } from "../auth/accounts.ts";
import { hashPassword, verifyPassword } from "../auth/crypto.ts";
import type { Db } from "../db/client.ts";
import { definedOnly, isEmpty } from "../db/util.ts";
import { favouriteToppings, ingredientGroups, ingredients, sessions, users } from "../db/schema.ts";
import type { AppDeps, AppEnv } from "../http/env.ts";
import { ApiHttpError, readJson } from "../http/errors.ts";
import { currentUser, requireUser } from "../http/session.ts";

async function favouriteOf(db: Db, userId: string): Promise<Favourite> {
  const rows = await db
    .select({ id: ingredients.id, en: ingredients.nameEn, sv: ingredients.nameSv })
    .from(favouriteToppings)
    .innerJoin(ingredients, eq(ingredients.id, favouriteToppings.ingredientId))
    .innerJoin(ingredientGroups, eq(ingredientGroups.id, ingredients.groupId))
    .where(and(eq(favouriteToppings.userId, userId), isNull(ingredients.archivedAt)))
    .orderBy(asc(ingredientGroups.sort), asc(ingredients.sort), asc(ingredients.createdAt));
  return { ingredients: rows.map((r) => ({ id: r.id, name: { en: r.en, sv: r.sv } })) };
}

export function meRoutes(deps: AppDeps) {
  const { db } = deps;
  const routes = new Hono<AppEnv>();
  routes.use("*", requireUser);

  routes.get("/", (c) => c.json(toMe(currentUser(c))));

  routes.patch("/", async (c) => {
    const user = currentUser(c);
    const { name, language, reminders } = await readJson(c, updateMeSchema);
    const changes = definedOnly({
      name,
      language,
      remindBeforeClose: reminders?.beforeClose,
      remindDayBefore: reminders?.dayBefore,
    });
    if (isEmpty(changes)) return c.json(toMe(user));
    const [updated] = await db.update(users).set(changes).where(eq(users.id, user.id)).returning();
    return c.json(toMe(updated!));
  });

  routes.post("/password", async (c) => {
    const user = currentUser(c);
    const { currentPassword, newPassword } = await readJson(c, changePasswordSchema);
    if (!(await verifyPassword(user.passwordHash, currentPassword))) {
      throw new ApiHttpError(400, "invalid_credentials", "The current password is wrong.");
    }
    const passwordHash = await hashPassword(newPassword);
    await db.transaction(async (tx) => {
      await tx.update(users).set({ passwordHash }).where(eq(users.id, user.id));
      // Every other device is signed out; this one stays signed in.
      await tx
        .delete(sessions)
        .where(
          and(eq(sessions.userId, user.id), ne(sessions.tokenHash, c.get("sessionTokenHash")!)),
        );
    });
    return c.body(null, 204);
  });

  routes.get("/favourite", async (c) => c.json(await favouriteOf(db, currentUser(c).id)));

  routes.put("/favourite", async (c) => {
    const user = currentUser(c);
    const ids = [...new Set((await readJson(c, setFavouriteSchema)).ingredientIds)];
    if (ids.length) {
      const found = await db
        .select({ id: ingredients.id })
        .from(ingredients)
        .where(and(inArray(ingredients.id, ids), isNull(ingredients.archivedAt)));
      if (found.length !== ids.length) {
        throw new ApiHttpError(400, "validation_failed", "Unknown topping in the favourite.");
      }
    }
    await db.transaction(async (tx) => {
      await tx.delete(favouriteToppings).where(eq(favouriteToppings.userId, user.id));
      if (ids.length) {
        await tx
          .insert(favouriteToppings)
          .values(ids.map((ingredientId) => ({ userId: user.id, ingredientId })));
      }
    });
    return c.json(await favouriteOf(db, user.id));
  });

  return routes;
}
