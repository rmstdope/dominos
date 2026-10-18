import type { Language, Me, Role } from "@dominos/shared";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { authTokens, users, type User } from "../db/schema.ts";
import { hashToken, randomToken } from "./crypto.ts";

export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

type TokenKind = (typeof authTokens.$inferSelect)["kind"];

export function toMe(user: User): Me {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    language: user.language,
  };
}

export class AlreadyActiveError extends Error {
  readonly user: User;
  constructor(user: User) {
    super(`${user.email} already has an account`);
    this.user = user;
  }
}

/**
 * Creates the account for someone who does not have one yet, or refreshes a pending one, and
 * returns a fresh invitation token. Earlier unused invitations for the same person stop working.
 */
export async function inviteUser(
  db: Db,
  person: { email: string; name: string; role: Role; language: Language },
  now: Date,
  /**
   * Keep links sent earlier working. An event invitation adds a link to a new email, and every
   * email the person got should still let them in; resending replaces the old link instead.
   */
  { keepEarlierLinks = false }: { keepEarlierLinks?: boolean } = {},
): Promise<{ user: User; token: string }> {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(users).where(eq(users.email, person.email));
    if (existing?.passwordHash) throw new AlreadyActiveError(existing);

    const [user] = existing
      ? await tx
          .update(users)
          .set({
            name: person.name,
            role: person.role,
            language: person.language,
            disabledAt: null,
          })
          .where(eq(users.id, existing.id))
          .returning()
      : await tx.insert(users).values(person).returning();
    if (!user) throw new Error("Could not save the user");

    if (!keepEarlierLinks) {
      await tx
        .delete(authTokens)
        .where(
          and(
            eq(authTokens.userId, user.id),
            eq(authTokens.kind, "invite"),
            isNull(authTokens.usedAt),
          ),
        );
    }
    const token = await issueToken(tx, user.id, "invite", INVITATION_TTL_MS, now);
    return { user, token };
  });
}

export async function issueToken(
  db: Db,
  userId: string,
  kind: TokenKind,
  ttlMs: number,
  now: Date,
): Promise<string> {
  const token = randomToken();
  await db.insert(authTokens).values({
    userId,
    kind,
    tokenHash: hashToken(token),
    expiresAt: new Date(now.getTime() + ttlMs),
  });
  return token;
}

/** The token and its user, if the token exists, is unused and unexpired, and the user is enabled. */
export async function findUsableToken(db: Db, token: string, kind: TokenKind, now: Date) {
  const [row] = await db
    .select({ tokenId: authTokens.id, user: users })
    .from(authTokens)
    .innerJoin(users, eq(users.id, authTokens.userId))
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(token)),
        eq(authTokens.kind, kind),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, now),
        isNull(users.disabledAt),
      ),
    );
  return row ?? null;
}

/** Marks the token used. False if another request used it first. */
export async function consumeToken(db: Db, tokenId: string, now: Date): Promise<boolean> {
  const used = await db
    .update(authTokens)
    .set({ usedAt: now })
    .where(and(eq(authTokens.id, tokenId), isNull(authTokens.usedAt)))
    .returning({ id: authTokens.id });
  return used.length === 1;
}
