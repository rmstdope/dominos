import { eventPhase, inviteToEventSchema, type EventGuest } from "@dominos/shared";
import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import { Hono } from "hono";
import { AlreadyActiveError, inviteUser } from "../../auth/accounts.ts";
import type { Db } from "../../db/client.ts";
import { authTokens, eventInvitations, events, orders, users, type User } from "../../db/schema.ts";
import type { AppDeps, AppEnv } from "../../http/env.ts";
import { ApiHttpError, readJson } from "../../http/errors.ts";
import { conflict, idParam, notFound } from "../../http/params.ts";
import type { Email } from "../../mail/mailer.ts";
import {
  eventInvitationEmail,
  eventLink,
  invitationLink,
  welcomeToEventEmail,
} from "../../mail/templates.ts";

/** Everyone invited to an event, with whether they have looked at it and ordered. */
export async function eventGuests(db: Db, eventId: string, now: Date): Promise<EventGuest[]> {
  const pending = db
    .select({ userId: authTokens.userId, expiresAt: max(authTokens.expiresAt).as("expires_at") })
    .from(authTokens)
    .where(and(eq(authTokens.kind, "invite"), isNull(authTokens.usedAt)))
    .groupBy(authTokens.userId)
    .as("pending");
  const rows = await db
    .select({
      user: users,
      status: eventInvitations.status,
      invitedAt: eventInvitations.invitedAt,
      firstSeenAt: eventInvitations.firstSeenAt,
      orderId: orders.id,
      inviteExpiresAt: pending.expiresAt,
    })
    .from(eventInvitations)
    .innerJoin(users, eq(users.id, eventInvitations.userId))
    .leftJoin(
      orders,
      and(eq(orders.eventId, eventInvitations.eventId), eq(orders.userId, eventInvitations.userId)),
    )
    .leftJoin(pending, eq(pending.userId, users.id))
    .where(eq(eventInvitations.eventId, eventId))
    .orderBy(asc(users.name), asc(users.email));
  return rows.map((r) => ({
    userId: r.user.id,
    name: r.user.name,
    email: r.user.email,
    personStatus: r.user.disabledAt
      ? "disabled"
      : r.user.passwordHash
        ? "active"
        : r.inviteExpiresAt && r.inviteExpiresAt > now
          ? "invited"
          : "invitation_expired",
    invitation: r.status,
    invitedAt: r.invitedAt.toISOString(),
    seen: r.firstSeenAt !== null,
    ordered: r.orderId !== null,
  }));
}

export function invitationRoutes(deps: AppDeps) {
  const { db } = deps;
  const routes = new Hono<AppEnv>();

  routes.get("/events/:id/guests", async (c) => {
    const id = idParam(c);
    const [event] = await db.select({ id: events.id }).from(events).where(eq(events.id, id));
    if (!event) throw notFound("That event");
    return c.json(await eventGuests(db, id, deps.now()));
  });

  routes.post("/events/:id/invitations", async (c) => {
    const eventId = idParam(c);
    const { userIds, newPeople, message } = await readJson(c, inviteToEventSchema);
    const now = deps.now();
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) throw notFound("That event");
    if (eventPhase(event, now) !== "open") {
      throw conflict("Invitations go out once the event is published and open for orders.");
    }

    // People new to Dominos get an account first. Someone who turns out to have one already is
    // simply invited like everyone else.
    const tokens = new Map<string, string>();
    const ids = new Set(userIds);
    for (const person of newPeople) {
      try {
        const { user, token } = await inviteUser(db, { ...person, role: "customer" }, now, {
          keepEarlierLinks: true,
        });
        tokens.set(user.id, token);
        ids.add(user.id);
      } catch (err) {
        if (!(err instanceof AlreadyActiveError)) throw err;
        ids.add(err.user.id);
      }
    }

    const people = ids.size
      ? await db
          .select()
          .from(users)
          .where(inArray(users.id, [...ids]))
      : [];
    if (people.length !== ids.size || people.some((p) => p.disabledAt)) {
      throw new ApiHttpError(400, "validation_failed", "Someone on the list cannot be invited.");
    }
    // Someone with a pending account gets a fresh account link with the event.
    for (const person of people) {
      if (!person.passwordHash && !tokens.has(person.id)) {
        tokens.set(
          person.id,
          (await inviteUser(db, person, now, { keepEarlierLinks: true })).token,
        );
      }
    }

    const added = await db
      .insert(eventInvitations)
      .values(people.map((p) => ({ eventId, userId: p.id, invitedAt: now })))
      .onConflictDoNothing()
      .returning({ userId: eventInvitations.userId });
    const fresh = new Set(added.map((a) => a.userId));

    // Only people invited just now get an email; asking again is what reminders are for.
    const emails: Email[] = people
      .filter((p) => fresh.has(p.id))
      .map((p: User) => {
        const token = tokens.get(p.id);
        return token
          ? welcomeToEventEmail(p, event, invitationLink(deps.config.appOrigin, token), message)
          : eventInvitationEmail(p, event, eventLink(deps.config.appOrigin, eventId), message);
      });
    const results = await Promise.allSettled(emails.map((e) => deps.mailer.send(e)));
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length) {
      for (const f of failed) console.error("Could not send an event invitation:", f.reason);
      throw new ApiHttpError(
        502,
        "internal",
        `Everyone was invited, but ${failed.length} of the emails could not be sent.`,
      );
    }
    return c.json(await eventGuests(db, eventId, now));
  });

  return routes;
}
