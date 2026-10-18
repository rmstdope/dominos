import {
  invitePersonSchema,
  updatePersonSchema,
  type Person,
  type PersonStatus,
} from "@dominos/shared";
import { and, asc, eq, isNotNull, isNull, max, ne } from "drizzle-orm";
import { Hono } from "hono";
import { AlreadyActiveError, inviteUser } from "../../auth/accounts.ts";
import { deleteUserSessions } from "../../auth/sessions.ts";
import type { Db } from "../../db/client.ts";
import { authTokens, users, type User } from "../../db/schema.ts";
import { definedOnly, isEmpty } from "../../db/util.ts";
import type { AppDeps, AppEnv } from "../../http/env.ts";
import { ApiHttpError, readJson } from "../../http/errors.ts";
import { conflict, idParam, notFound } from "../../http/params.ts";
import { invitationEmail, invitationLink } from "../../mail/templates.ts";

function personStatus(user: User, inviteExpiresAt: Date | null, now: Date): PersonStatus {
  if (user.disabledAt) return "disabled";
  if (user.passwordHash) return "active";
  return inviteExpiresAt && inviteExpiresAt > now ? "invited" : "invitation_expired";
}

const toPerson = (user: User, status: PersonStatus): Person => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  language: user.language,
  status,
});

/** Everyone with their status; `id` narrows it to one person. */
async function listPeople(db: Db, now: Date, id?: string): Promise<Person[]> {
  const pending = db
    .select({ userId: authTokens.userId, expiresAt: max(authTokens.expiresAt).as("expires_at") })
    .from(authTokens)
    .where(and(eq(authTokens.kind, "invite"), isNull(authTokens.usedAt)))
    .groupBy(authTokens.userId)
    .as("pending");
  const rows = await db
    .select({ user: users, inviteExpiresAt: pending.expiresAt })
    .from(users)
    .leftJoin(pending, eq(pending.userId, users.id))
    .where(id ? eq(users.id, id) : undefined)
    .orderBy(asc(users.name), asc(users.email));
  return rows.map(({ user, inviteExpiresAt }) =>
    toPerson(user, personStatus(user, inviteExpiresAt, now)),
  );
}

export function peopleRoutes(deps: AppDeps) {
  const { db } = deps;
  const routes = new Hono<AppEnv>();

  async function sendInvitation(user: User, token: string) {
    try {
      await deps.mailer.send(invitationEmail(user, invitationLink(deps.config.appOrigin, token)));
    } catch (err) {
      console.error("Could not send an invitation:", err);
      throw new ApiHttpError(
        502,
        "internal",
        "The person was saved, but the invitation email could not be sent. Try resending it.",
      );
    }
  }

  async function onePerson(id: string) {
    const [person] = await listPeople(db, deps.now(), id);
    if (!person) throw notFound("That person");
    return person;
  }

  routes.get("/people", async (c) => c.json(await listPeople(db, deps.now())));

  routes.post("/people", async (c) => {
    const person = await readJson(c, invitePersonSchema);
    let invited;
    try {
      invited = await inviteUser(db, person, deps.now());
    } catch (err) {
      if (err instanceof AlreadyActiveError)
        throw conflict(`${person.email} already has an account.`);
      throw err;
    }
    await sendInvitation(invited.user, invited.token);
    return c.json(await onePerson(invited.user.id), 201);
  });

  routes.patch("/people/:id", async (c) => {
    const id = idParam(c);
    const { email, name, role, disabled } = await readJson(c, updatePersonSchema);
    const now = deps.now();

    await db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, id)).for("update");
      if (!user) throw notFound("That person");

      const losesStaff =
        user.role === "staff" &&
        user.passwordHash !== null &&
        user.disabledAt === null &&
        (role === "customer" || disabled === true);
      if (losesStaff) {
        // Locked, so two staff demoting each other at once cannot both succeed.
        const others = await tx
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.role, "staff"),
              isNull(users.disabledAt),
              isNotNull(users.passwordHash),
              ne(users.id, id),
            ),
          )
          .for("update");
        if (others.length === 0) throw conflict("There must always be at least one staff member.");
      }

      if (email && email !== user.email) {
        const [taken] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email));
        if (taken) throw conflict(`${email} already belongs to someone else.`);
      }

      const changes = definedOnly({
        email,
        name,
        role,
        disabledAt: disabled === undefined ? undefined : disabled ? (user.disabledAt ?? now) : null,
      });
      if (!isEmpty(changes)) await tx.update(users).set(changes).where(eq(users.id, id));
      if (disabled) await deleteUserSessions(tx, id);
    });

    return c.json(await onePerson(id));
  });

  routes.post("/people/:id/resend-invitation", async (c) => {
    const id = idParam(c);
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) throw notFound("That person");
    if (user.passwordHash) throw conflict(`${user.email} has already accepted their invitation.`);
    const invited = await inviteUser(db, user, deps.now());
    await sendInvitation(invited.user, invited.token);
    return c.json(await onePerson(id));
  });

  return routes;
}
