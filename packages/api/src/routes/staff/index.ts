import { Hono } from "hono";
import type { AppDeps, AppEnv } from "../../http/env.ts";
import { requireStaff } from "../../http/session.ts";
import { eventRoutes } from "./events.ts";
import { ingredientRoutes } from "./ingredients.ts";
import { peopleRoutes } from "./people.ts";

/** Everything under /api/staff: 401 when signed out, 403 for customers. */
export function staffRoutes(deps: AppDeps) {
  const routes = new Hono<AppEnv>();
  routes.use("*", requireStaff);
  routes.route("/", ingredientRoutes(deps));
  routes.route("/", peopleRoutes(deps));
  routes.route("/", eventRoutes(deps));
  return routes;
}
