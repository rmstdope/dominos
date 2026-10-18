import { Hono } from "hono";
import { toMe } from "../auth/accounts.ts";
import type { AppEnv } from "../http/env.ts";
import { currentUser, requireUser } from "../http/session.ts";

export function meRoutes() {
  const routes = new Hono<AppEnv>();
  routes.get("/", requireUser, (c) => c.json(toMe(currentUser(c))));
  return routes;
}
