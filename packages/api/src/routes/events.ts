import {
  eventPhase,
  placeOrderSchema,
  type GuestEvent,
  type GuestEventDetail,
  type Localized,
  type Order,
} from "@dominos/shared";
import { and, asc, eq, inArray, isNull, max, ne } from "drizzle-orm";
import { Hono } from "hono";
import type { Db } from "../db/client.ts";
import { bothLanguages } from "../db/util.ts";
import {
  eventIngredients,
  eventInvitations,
  events,
  ingredientGroups,
  ingredients,
  orderToppings,
  orders,
  type EventRow,
} from "../db/schema.ts";
import type { AppDeps, AppEnv } from "../http/env.ts";
import { ApiHttpError, readJson } from "../http/errors.ts";
import { conflict, idParam, notFound } from "../http/params.ts";
import { currentUser, requireUser } from "../http/session.ts";
import { toIngredientGroup } from "./staff/ingredients.ts";

type Invited = { event: EventRow; status: "invited" | "declined"; firstSeenAt: Date | null };

/** The events a person is invited to. Drafts stay hidden until staff publish them. */
async function invitedEvents(db: Db, userId: string, eventId?: string): Promise<Invited[]> {
  return db
    .select({
      event: events,
      status: eventInvitations.status,
      firstSeenAt: eventInvitations.firstSeenAt,
    })
    .from(eventInvitations)
    .innerJoin(events, eq(events.id, eventInvitations.eventId))
    .where(
      and(
        eq(eventInvitations.userId, userId),
        ne(events.status, "draft"),
        eventId ? eq(events.id, eventId) : undefined,
      ),
    )
    .orderBy(asc(events.startsAt));
}

/** Each event's order for this person, with its toppings in menu order. */
async function ordersOf(
  db: Db,
  userId: string,
  eventIds: string[],
): Promise<Map<string, { order: Order; names: Localized[] }>> {
  const found = new Map<string, { order: Order; names: Localized[] }>();
  if (eventIds.length === 0) return found;
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), inArray(orders.eventId, eventIds)));
  if (rows.length === 0) return found;
  const toppings = await db
    .select({
      orderId: orderToppings.orderId,
      id: ingredients.id,
      nameEn: ingredients.nameEn,
      nameSv: ingredients.nameSv,
    })
    .from(orderToppings)
    .innerJoin(ingredients, eq(ingredients.id, orderToppings.ingredientId))
    .innerJoin(ingredientGroups, eq(ingredientGroups.id, ingredients.groupId))
    .where(
      inArray(
        orderToppings.orderId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(ingredientGroups.sort), asc(ingredients.sort), asc(ingredients.createdAt));
  for (const row of rows) {
    const mine = toppings.filter((t) => t.orderId === row.id);
    found.set(row.eventId, {
      order: {
        number: row.number,
        toppingIds: mine.map((t) => t.id),
        makeOwn: row.makeOwn,
        smallerThicker: row.smallerThicker,
        comment: row.comment,
      },
      names: mine.map((t) => ({ en: t.nameEn, sv: t.nameSv })),
    });
  }
  return found;
}

function toGuestEvent(
  invited: Invited,
  order: { order: Order; names: Localized[] } | undefined,
  now: Date,
): GuestEvent {
  const { event } = invited;
  return {
    id: event.id,
    name: bothLanguages(event.name, event.nameSv),
    startsAt: event.startsAt.toISOString(),
    location: bothLanguages(event.location, event.locationSv),
    ordersCloseAt: event.ordersCloseAt.toISOString(),
    phase: eventPhase(event, now),
    invitation: invited.status,
    order: order?.order ?? null,
    orderToppings: order?.names ?? [],
  };
}

export function guestEventRoutes(deps: AppDeps) {
  const { db } = deps;
  const routes = new Hono<AppEnv>();
  routes.use("*", requireUser);

  async function loadInvited(userId: string, eventId: string): Promise<Invited> {
    const [invited] = await invitedEvents(db, userId, eventId);
    // Not invited looks the same as not existing: the event is none of their business.
    if (!invited) throw notFound("That event");
    return invited;
  }

  async function detail(userId: string, eventId: string): Promise<GuestEventDetail> {
    const invited = await loadInvited(userId, eventId);
    const { event } = invited;
    const menu = await db
      .select({ ingredient: ingredients })
      .from(eventIngredients)
      .innerJoin(ingredients, eq(ingredients.id, eventIngredients.ingredientId))
      .innerJoin(ingredientGroups, eq(ingredientGroups.id, ingredients.groupId))
      .where(and(eq(eventIngredients.eventId, eventId), isNull(ingredients.archivedAt)))
      .orderBy(asc(ingredientGroups.sort), asc(ingredients.sort), asc(ingredients.createdAt));
    const groupIds = [...new Set(menu.map((m) => m.ingredient.groupId))];
    const groups = groupIds.length
      ? await db
          .select()
          .from(ingredientGroups)
          .where(inArray(ingredientGroups.id, groupIds))
          .orderBy(asc(ingredientGroups.sort), asc(ingredientGroups.createdAt))
      : [];
    const order = (await ordersOf(db, userId, [eventId])).get(eventId);
    return {
      ...toGuestEvent(invited, order, deps.now()),
      maxToppings: event.maxToppings,
      note:
        event.noteEn !== null && event.noteSv !== null
          ? { en: event.noteEn, sv: event.noteSv }
          : null,
      askMakeOwn: event.askMakeOwn,
      askSmallerThicker: event.askSmallerThicker,
      groups: groups.map(toIngredientGroup),
      menu: menu.map(({ ingredient: i }) => ({
        id: i.id,
        groupId: i.groupId,
        name: { en: i.nameEn, sv: i.nameSv },
        emoji: i.emoji,
        inStock: i.inStock,
      })),
    };
  }

  /** Orders can be placed, changed or withdrawn only while they are open. */
  function requireOpen(invited: Invited) {
    if (eventPhase(invited.event, deps.now()) !== "open") {
      throw conflict("Orders for this event are closed.");
    }
  }

  routes.get("/", async (c) => {
    const user = currentUser(c);
    const list = await invitedEvents(db, user.id);
    const placed = await ordersOf(
      db,
      user.id,
      list.map((i) => i.event.id),
    );
    const now = deps.now();
    return c.json(list.map((i) => toGuestEvent(i, placed.get(i.event.id), now)));
  });

  routes.get("/:id", async (c) => {
    const user = currentUser(c);
    const eventId = idParam(c);
    const body = await detail(user.id, eventId);
    // Staff can see who has looked at the event.
    await db
      .update(eventInvitations)
      .set({ firstSeenAt: deps.now() })
      .where(
        and(
          eq(eventInvitations.eventId, eventId),
          eq(eventInvitations.userId, user.id),
          isNull(eventInvitations.firstSeenAt),
        ),
      );
    return c.json(body);
  });

  routes.put("/:id/order", async (c) => {
    const user = currentUser(c);
    const eventId = idParam(c);
    const { toppingIds, makeOwn, smallerThicker, comment } = await readJson(c, placeOrderSchema);
    const invited = await loadInvited(user.id, eventId);
    requireOpen(invited);
    const { event } = invited;

    const picked = [...new Set(toppingIds)];
    if (event.maxToppings !== null && picked.length > event.maxToppings) {
      throw new ApiHttpError(
        400,
        "validation_failed",
        `Pick at most ${event.maxToppings} toppings.`,
      );
    }
    const current = (await ordersOf(db, user.id, [eventId])).get(eventId);
    const kept = new Set(current?.order.toppingIds ?? []);
    const menu = picked.length
      ? await db
          .select({ id: ingredients.id, inStock: ingredients.inStock })
          .from(eventIngredients)
          .innerJoin(ingredients, eq(ingredients.id, eventIngredients.ingredientId))
          .where(
            and(
              eq(eventIngredients.eventId, eventId),
              inArray(ingredients.id, picked),
              isNull(ingredients.archivedAt),
            ),
          )
      : [];
    // A topping that ran out can stay on an order that already has it, but not be added.
    const usable = menu.filter((m) => m.inStock || kept.has(m.id));
    if (usable.length !== picked.length) {
      throw new ApiHttpError(
        400,
        "validation_failed",
        "A topping is not on the menu or has run out.",
      );
    }

    const values = {
      makeOwn: event.askMakeOwn && makeOwn,
      smallerThicker: event.askSmallerThicker && smallerThicker,
      comment: comment || null,
      updatedAt: deps.now(),
    };
    const save = () =>
      db.transaction(async (tx) => {
        // Ordering means coming, even after saying no earlier.
        await tx
          .update(eventInvitations)
          .set({ status: "invited" })
          .where(and(eq(eventInvitations.eventId, eventId), eq(eventInvitations.userId, user.id)));
        const [existing] = await tx
          .select({ id: orders.id })
          .from(orders)
          .where(and(eq(orders.eventId, eventId), eq(orders.userId, user.id)));
        let orderId = existing?.id;
        if (orderId) {
          await tx.update(orders).set(values).where(eq(orders.id, orderId));
          await tx.delete(orderToppings).where(eq(orderToppings.orderId, orderId));
        } else {
          const [{ last } = { last: null }] = await tx
            .select({ last: max(orders.number) })
            .from(orders)
            .where(eq(orders.eventId, eventId));
          const [created] = await tx
            .insert(orders)
            .values({ eventId, userId: user.id, number: (last ?? 0) + 1, ...values })
            .returning({ id: orders.id });
          orderId = created!.id;
        }
        if (picked.length) {
          await tx
            .insert(orderToppings)
            .values(picked.map((ingredientId) => ({ orderId: orderId!, ingredientId })));
        }
      });
    try {
      await save();
    } catch (err) {
      // Two first orders at once can pick the same number; the loser simply tries again.
      if (!isUniqueViolation(err)) throw err;
      await save();
    }
    return c.json(await detail(user.id, eventId));
  });

  routes.delete("/:id/order", async (c) => {
    const user = currentUser(c);
    const eventId = idParam(c);
    requireOpen(await loadInvited(user.id, eventId));
    await db.delete(orders).where(and(eq(orders.eventId, eventId), eq(orders.userId, user.id)));
    return c.json(await detail(user.id, eventId));
  });

  routes.post("/:id/decline", async (c) => {
    const user = currentUser(c);
    const eventId = idParam(c);
    requireOpen(await loadInvited(user.id, eventId));
    await db.transaction(async (tx) => {
      await tx
        .update(eventInvitations)
        .set({ status: "declined" })
        .where(and(eq(eventInvitations.eventId, eventId), eq(eventInvitations.userId, user.id)));
      await tx.delete(orders).where(and(eq(orders.eventId, eventId), eq(orders.userId, user.id)));
    });
    return c.json(await detail(user.id, eventId));
  });

  return routes;
}

function isUniqueViolation(err: unknown): boolean {
  const code =
    (err as { code?: string; cause?: { code?: string } } | null)?.code ??
    (err as { cause?: { code?: string } } | null)?.cause?.code;
  return code === "23505";
}
