import { changePasswordSchema, updateMeSchema } from "@dominos/shared";
import { and, eq, ne } from "drizzle-orm";
import { Hono } from "hono";
import { toMe } from "../auth/accounts.ts";
import { hashPassword, verifyPassword } from "../auth/crypto.ts";
import { definedOnly, isEmpty } from "../db/util.ts";
import { sessions, users } from "../db/schema.ts";
import type { AppDeps, AppEnv } from "../http/env.ts";
import { ApiHttpError, readJson } from "../http/errors.ts";
import { currentUser, requireUser } from "../http/session.ts";
import { pizzaRoutes } from "./pizzas.ts";

export function meRoutes(deps: AppDeps) {
  const { db } = deps;
  const routes = new Hono<AppEnv>();
  routes.use("*", requireUser);
  routes.route("/pizzas", pizzaRoutes(deps));

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

  return routes;
}
