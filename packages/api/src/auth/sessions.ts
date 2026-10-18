import { and, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { sessions, users, type User } from "../db/schema.ts";
import { hashToken, randomToken } from "./crypto.ts";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** A session in use is pushed forward at most once a day, not on every request. */
const EXTEND_AFTER_MS = 24 * 60 * 60 * 1000;

export type Session = { tokenHash: string; user: User; expiresAt: Date };

export async function createSession(
  db: Db,
  userId: string,
  now: Date,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  return { token, expiresAt };
}

/** The session for a cookie token, or null if it is unknown, expired, or its user is disabled. */
export async function findSession(db: Db, token: string, now: Date): Promise<Session | null> {
  const tokenHash = hashToken(token);
  const [row] = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now), isNull(users.disabledAt)),
    );
  return row ? { tokenHash, ...row } : null;
}

/** Slides an active session's expiry forward; returns the new expiry when it moved. */
export async function extendSession(db: Db, session: Session, now: Date): Promise<Date | null> {
  const remaining = session.expiresAt.getTime() - now.getTime();
  if (remaining > SESSION_TTL_MS - EXTEND_AFTER_MS) return null;
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.update(sessions).set({ expiresAt }).where(eq(sessions.tokenHash, session.tokenHash));
  return expiresAt;
}

export async function deleteSession(db: Db, tokenHash: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

/** Signs the user out everywhere, e.g. after a password reset. */
export async function deleteUserSessions(db: Db, userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
