import { and, asc, eq, gt, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import type { Db } from "./db/client.ts";
import {
  eventInvitations,
  events,
  ingredientGroups,
  ingredients,
  orderToppings,
  orders,
  remindersSent,
  users,
  type EventRow,
  type User,
} from "./db/schema.ts";
import type { Email, Mailer } from "./mail/mailer.ts";
import { dayBeforeEmail, eventLink, orderReminderEmail } from "./mail/templates.ts";

const DAY = 24 * 60 * 60 * 1000;
const FRESH_INVITATION_MS = 12 * 60 * 60 * 1000;

/** How often the API looks for reminders to send. */
export const REMINDER_INTERVAL_MS = 10 * 60 * 1000;

type Deps = { db: Db; mailer: Mailer; appOrigin: string; now: Date };

/** People invited to the event who can sign in and have not said no. */
async function guestsOf(db: Db, eventId: string) {
  return db
    .select({ user: users, orderId: orders.id, invitedAt: eventInvitations.invitedAt })
    .from(eventInvitations)
    .innerJoin(users, eq(users.id, eventInvitations.userId))
    .leftJoin(orders, and(eq(orders.eventId, eventId), eq(orders.userId, users.id)))
    .where(
      and(
        eq(eventInvitations.eventId, eventId),
        eq(eventInvitations.status, "invited"),
        isNull(users.disabledAt),
        isNotNull(users.passwordHash),
      ),
    );
}

/** Everyone invited who has not ordered: for the reminder staff send by hand. */
export async function remindNotOrdered(deps: Deps, event: EventRow): Promise<number> {
  const waiting = (await guestsOf(deps.db, event.id)).filter((g) => !g.orderId);
  const link = eventLink(deps.appOrigin, event.id);
  await Promise.all(
    waiting.map(({ user }) => deps.mailer.send(orderReminderEmail(user, event, link))),
  );
  return waiting.length;
}

/**
 * Sends the automatic reminders that are due: a day before orders close to people who have not
 * ordered, and a day before the event to people who have. Each person gets each reminder once,
 * even if this runs twice at the same moment, and only if they want it.
 */
export async function sendDueReminders(deps: Deps): Promise<number> {
  const { db, now } = deps;
  const soon = new Date(now.getTime() + DAY);
  let sent = 0;

  const closing = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.status, "published"),
        gt(events.ordersCloseAt, now),
        lte(events.ordersCloseAt, soon),
      ),
    );
  for (const event of closing) {
    // Someone invited in the last few hours just got the invitation; no reminder on top of it.
    const due = (await guestsOf(db, event.id)).filter(
      (g) =>
        !g.orderId &&
        g.user.remindBeforeClose &&
        g.invitedAt.getTime() <= now.getTime() - FRESH_INVITATION_MS,
    );
    const link = eventLink(deps.appOrigin, event.id);
    for (const { user } of due) {
      sent += await once(deps, event, user, "before_close", () =>
        orderReminderEmail(user, event, link),
      );
    }
  }

  const tomorrow = await db
    .select()
    .from(events)
    .where(
      and(eq(events.status, "published"), gt(events.startsAt, now), lte(events.startsAt, soon)),
    );
  for (const event of tomorrow) {
    const due = (await guestsOf(db, event.id)).filter((g) => g.orderId && g.user.remindDayBefore);
    const toppings = await toppingsByOrder(
      db,
      due.map((g) => g.orderId!),
    );
    const link = eventLink(deps.appOrigin, event.id);
    for (const { user, orderId } of due) {
      const names = (toppings.get(orderId!) ?? []).map((n) => n[user.language]);
      sent += await once(deps, event, user, "day_before", () =>
        dayBeforeEmail(user, event, names, link),
      );
    }
  }
  return sent;
}

/** Claims the reminder, then sends it; a failed send gives the claim back for the next run. */
async function once(
  deps: Deps,
  event: EventRow,
  user: User,
  kind: "before_close" | "day_before",
  email: () => Email,
): Promise<number> {
  const claimed = await deps.db
    .insert(remindersSent)
    .values({ eventId: event.id, userId: user.id, kind, sentAt: deps.now })
    .onConflictDoNothing()
    .returning({ userId: remindersSent.userId });
  if (claimed.length === 0) return 0;
  try {
    await deps.mailer.send(email());
    return 1;
  } catch (err) {
    console.error(`Could not send the ${kind} reminder to ${user.email}:`, err);
    await deps.db
      .delete(remindersSent)
      .where(
        and(
          eq(remindersSent.eventId, event.id),
          eq(remindersSent.userId, user.id),
          eq(remindersSent.kind, kind),
        ),
      );
    return 0;
  }
}

async function toppingsByOrder(db: Db, orderIds: string[]) {
  const names = new Map<string, { en: string; sv: string }[]>();
  if (orderIds.length === 0) return names;
  const rows = await db
    .select({ orderId: orderToppings.orderId, en: ingredients.nameEn, sv: ingredients.nameSv })
    .from(orderToppings)
    .innerJoin(ingredients, eq(ingredients.id, orderToppings.ingredientId))
    .innerJoin(ingredientGroups, eq(ingredientGroups.id, ingredients.groupId))
    .where(inArray(orderToppings.orderId, orderIds))
    .orderBy(asc(ingredientGroups.sort), asc(ingredients.sort), asc(ingredients.createdAt));
  for (const { orderId, ...name } of rows)
    names.set(orderId, [...(names.get(orderId) ?? []), name]);
  return names;
}
