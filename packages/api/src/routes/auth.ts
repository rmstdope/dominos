import {
  acceptInvitationRequestSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  resetPasswordRequestSchema,
  type InvitationInfo,
} from "@dominos/shared";
import { and, asc, eq, gt, isNotNull, isNull, ne } from "drizzle-orm";
import { Hono } from "hono";
import {
  PASSWORD_RESET_TTL_MS,
  consumeToken,
  findUsableToken,
  issueToken,
  toMe,
} from "../auth/accounts.ts";
import { hashPassword, verifyPassword } from "../auth/crypto.ts";
import { deleteUserSessions } from "../auth/sessions.ts";
import { authTokens, eventInvitations, events, users } from "../db/schema.ts";
import { bothLanguages } from "../db/util.ts";
import type { AppDeps, AppEnv } from "../http/env.ts";
import { ApiHttpError, readJson } from "../http/errors.ts";
import { RateLimiter, rateLimit } from "../http/rate-limit.ts";
import { endSession, startSession } from "../http/session.ts";
import { passwordResetEmail, passwordResetLink } from "../mail/templates.ts";

const MINUTE = 60 * 1000;

const invalidInvitation = () =>
  new ApiHttpError(404, "invalid_token", "This invitation link has expired or was already used.");
const invalidReset = () =>
  new ApiHttpError(404, "invalid_token", "This reset link has expired or was already used.");

export function authRoutes(deps: AppDeps) {
  const clock = () => deps.now().getTime();
  // Per address, against guessing many accounts; per email, against guessing one account's
  // password from many addresses.
  const signInByIp = new RateLimiter(30, 15 * MINUTE, clock);
  const signInByEmail = new RateLimiter(10, 15 * MINUTE, clock);
  const tokenByIp = new RateLimiter(30, 15 * MINUTE, clock);
  const forgotByIp = new RateLimiter(10, 60 * MINUTE, clock);
  const forgotByEmail = new RateLimiter(3, 60 * MINUTE, clock);

  const routes = new Hono<AppEnv>();

  routes.post(
    "/login",
    rateLimit(signInByIp, (ip) => ip),
    async (c) => {
      const { email, password } = await readJson(c, loginRequestSchema);
      if (!signInByEmail.take(email)) {
        throw new ApiHttpError(
          429,
          "rate_limited",
          "Too many attempts. Try again in a few minutes.",
        );
      }
      const [user] = await deps.db.select().from(users).where(eq(users.email, email));
      const usable = user && !user.disabledAt ? user : undefined;
      const ok = await verifyPassword(usable?.passwordHash, password);
      if (!usable || !ok) {
        throw new ApiHttpError(401, "invalid_credentials", "Wrong email or password.");
      }
      await startSession(c, deps, usable);
      return c.json(toMe(usable));
    },
  );

  routes.post("/logout", async (c) => {
    await endSession(c, deps);
    return c.body(null, 204);
  });

  routes.get(
    "/invitations/:token",
    rateLimit(tokenByIp, (ip) => ip),
    async (c) => {
      const found = await findUsableToken(deps.db, c.req.param("token"), "invite", deps.now());
      if (!found || found.user.passwordHash) throw invalidInvitation();
      // The event they were invited to, if any, so the screen can say what the account is for.
      const [next] = await deps.db
        .select({
          id: events.id,
          name: events.name,
          nameSv: events.nameSv,
          startsAt: events.startsAt,
          location: events.location,
          locationSv: events.locationSv,
        })
        .from(eventInvitations)
        .innerJoin(events, eq(events.id, eventInvitations.eventId))
        .where(
          and(
            eq(eventInvitations.userId, found.user.id),
            eq(events.status, "published"),
            gt(events.ordersCloseAt, deps.now()),
          ),
        )
        .orderBy(asc(events.startsAt))
        .limit(1);
      const info: InvitationInfo = {
        email: found.user.email,
        name: found.user.name,
        event: next
          ? {
              id: next.id,
              name: bothLanguages(next.name, next.nameSv),
              startsAt: next.startsAt.toISOString(),
              location: bothLanguages(next.location, next.locationSv),
            }
          : null,
      };
      return c.json(info);
    },
  );

  routes.post(
    "/invitations/:token",
    rateLimit(tokenByIp, (ip) => ip),
    async (c) => {
      const { name, password } = await readJson(c, acceptInvitationRequestSchema);
      const now = deps.now();
      const found = await findUsableToken(deps.db, c.req.param("token"), "invite", now);
      if (!found || found.user.passwordHash) throw invalidInvitation();
      const passwordHash = await hashPassword(password);

      const user = await deps.db.transaction(async (tx) => {
        if (!(await consumeToken(tx, found.tokenId, now))) return null;
        const [updated] = await tx
          .update(users)
          .set({ name, passwordHash })
          .where(and(eq(users.id, found.user.id), isNull(users.passwordHash)))
          .returning();
        return updated ?? null;
      });
      if (!user) throw invalidInvitation();

      await startSession(c, deps, user);
      return c.json(toMe(user));
    },
  );

  routes.post(
    "/forgot",
    rateLimit(forgotByIp, (ip) => ip),
    async (c) => {
      const { email } = await readJson(c, forgotPasswordRequestSchema);
      // The same answer, just as fast, whether or not the email has an account.
      if (forgotByEmail.take(email)) {
        deps.defer(async () => {
          const now = deps.now();
          const [user] = await deps.db
            .select()
            .from(users)
            .where(
              and(eq(users.email, email), isNull(users.disabledAt), isNotNull(users.passwordHash)),
            );
          if (!user) return;
          const token = await issueToken(deps.db, user.id, "reset", PASSWORD_RESET_TTL_MS, now);
          await deps.mailer.send(
            passwordResetEmail(user, passwordResetLink(deps.config.appOrigin, token)),
          );
        });
      }
      return c.body(null, 204);
    },
  );

  routes.post(
    "/reset",
    rateLimit(tokenByIp, (ip) => ip),
    async (c) => {
      const { token, password } = await readJson(c, resetPasswordRequestSchema);
      const now = deps.now();
      const found = await findUsableToken(deps.db, token, "reset", now);
      if (!found) throw invalidReset();
      const passwordHash = await hashPassword(password);

      const user = await deps.db.transaction(async (tx) => {
        if (!(await consumeToken(tx, found.tokenId, now))) return null;
        // Other reset links sent earlier stop working too.
        await tx
          .delete(authTokens)
          .where(
            and(
              eq(authTokens.userId, found.user.id),
              eq(authTokens.kind, "reset"),
              ne(authTokens.id, found.tokenId),
            ),
          );
        const [updated] = await tx
          .update(users)
          .set({ passwordHash })
          .where(eq(users.id, found.user.id))
          .returning();
        // Whoever knew the old password is signed out everywhere.
        await deleteUserSessions(tx, found.user.id);
        return updated ?? null;
      });
      if (!user) throw invalidReset();

      c.set("sessionTokenHash", null);
      await startSession(c, deps, user);
      return c.json(toMe(user));
    },
  );

  return routes;
}
