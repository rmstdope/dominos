import { getConnInfo } from "@hono/node-server/conninfo";
import { sql } from "drizzle-orm";
import { Hono, type MiddlewareHandler } from "hono";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import type { AppDeps, AppEnv } from "./http/env.ts";
import { ApiHttpError, errorBody } from "./http/errors.ts";
import { loadSession } from "./http/session.ts";
import { authRoutes } from "./routes/auth.ts";
import { guestEventRoutes } from "./routes/events.ts";
import { meRoutes } from "./routes/me.ts";
import { staffRoutes } from "./routes/staff/index.ts";

function clientIp(trustProxy: boolean): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    let ip: string | undefined;
    if (trustProxy) {
      // Caddy appends the address it saw, so the last hop is the one nobody can forge.
      ip = c.req.header("x-forwarded-for")?.split(",").at(-1)?.trim();
    }
    if (!ip) {
      try {
        ip = getConnInfo(c).remote.address;
      } catch {
        // app.request() in tests has no socket.
      }
    }
    c.set("clientIp", ip || "unknown");
    await next();
  };
}

export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>();

  app.use("/api/*", clientIp(deps.config.trustProxy));
  // Refuses form posts from other sites; JSON from other sites is refused by readJson() and the
  // browser, since the API never answers a CORS preflight.
  app.use("/api/*", csrf({ origin: deps.config.appOrigin }));
  app.use("/api/*", loadSession(deps));

  app.get("/api/health", async (c) => {
    await deps.db.execute(sql`select 1`);
    return c.json({ ok: true });
  });
  app.route("/api/auth", authRoutes(deps));
  app.route("/api/me", meRoutes());
  app.route("/api/events", guestEventRoutes(deps));
  app.route("/api/staff", staffRoutes(deps));

  app.notFound((c) => c.json(errorBody("not_found", "No such endpoint."), 404));
  app.onError((err, c) => {
    if (err instanceof ApiHttpError) return c.json(errorBody(err.code, err.message), err.status);
    if (err instanceof HTTPException && err.status === 403) {
      return c.json(errorBody("forbidden", "Request refused."), 403);
    }
    console.error(err);
    return c.json(errorBody("internal", "Something went wrong."), 500);
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
