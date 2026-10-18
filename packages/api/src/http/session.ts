import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createSession, deleteSession, extendSession, findSession } from "../auth/sessions.ts";
import type { User } from "../db/schema.ts";
import type { AppDeps, AppEnv } from "./env.ts";
import { ApiHttpError } from "./errors.ts";

export const SESSION_COOKIE = "dominos_session";

function writeCookie(c: Context, deps: AppDeps, token: string, expiresAt: Date) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: deps.config.cookieSecure,
    sameSite: "Lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Loads the signed-in user, if any, into `c.var.user`, and keeps an active session alive. */
export function loadSession(deps: AppDeps): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    c.set("user", null);
    c.set("sessionTokenHash", null);
    const token = getCookie(c, SESSION_COOKIE);
    if (token) {
      const now = deps.now();
      const session = await findSession(deps.db, token, now);
      if (session) {
        c.set("user", session.user);
        c.set("sessionTokenHash", session.tokenHash);
        const extended = await extendSession(deps.db, session, now);
        if (extended) writeCookie(c, deps, token, extended);
      } else {
        deleteCookie(c, SESSION_COOKIE, { path: "/" });
      }
    }
    await next();
  };
}

/** Replaces whatever session the browser had with a new one for `user`. */
export async function startSession(c: Context<AppEnv>, deps: AppDeps, user: User): Promise<void> {
  const previous = c.get("sessionTokenHash");
  if (previous) await deleteSession(deps.db, previous);
  const { token, expiresAt } = await createSession(deps.db, user.id, deps.now());
  writeCookie(c, deps, token, expiresAt);
  c.set("user", user);
}

export async function endSession(c: Context<AppEnv>, deps: AppDeps): Promise<void> {
  const tokenHash = c.get("sessionTokenHash");
  if (tokenHash) await deleteSession(deps.db, tokenHash);
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  c.set("user", null);
  c.set("sessionTokenHash", null);
}

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get("user")) throw new ApiHttpError(401, "unauthorized", "Sign in first.");
  await next();
};

export const requireStaff: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = c.get("user");
  if (!user) throw new ApiHttpError(401, "unauthorized", "Sign in first.");
  if (user.role !== "staff") throw new ApiHttpError(403, "forbidden", "Only staff can do that.");
  await next();
};

/** The signed-in user in a handler behind `requireUser`. */
export function currentUser(c: Context<AppEnv>): User {
  const user = c.get("user");
  if (!user) throw new ApiHttpError(401, "unauthorized", "Sign in first.");
  return user;
}
