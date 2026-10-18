import {
  createEventSchema,
  eventPhase,
  ordersCloseBeforeStart,
  setMenuSchema,
  updateEventSchema,
  type StaffEvent,
  type UpdateEvent,
} from "@dominos/shared";
import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Db } from "../../db/client.ts";
import {
  eventIngredients,
  eventInvitations,
  events,
  ingredients,
  orders,
  type EventRow,
} from "../../db/schema.ts";
import { definedOnly } from "../../db/util.ts";
import type { AppDeps, AppEnv } from "../../http/env.ts";
import { ApiHttpError, readJson } from "../../http/errors.ts";
import { conflict, idParam, notFound } from "../../http/params.ts";
import { currentUser } from "../../http/session.ts";

type GuestCounts = StaffEvent["guests"];
const noGuests: GuestCounts = { invited: 0, declined: 0, ordered: 0 };

function toStaffEvent(
  row: EventRow,
  ingredientIds: string[],
  guests: GuestCounts,
  now: Date,
): StaffEvent {
  return {
    id: row.id,
    name: row.name,
    startsAt: row.startsAt.toISOString(),
    location: row.location,
    ordersCloseAt: row.ordersCloseAt.toISOString(),
    maxToppings: row.maxToppings,
    note: row.noteEn !== null && row.noteSv !== null ? { en: row.noteEn, sv: row.noteSv } : null,
    askMakeOwn: row.askMakeOwn,
    status: row.status,
    phase: eventPhase(row, now),
    ingredientIds,
    guests,
  };
}

/** The columns an UpdateEvent (or CreateEvent) sets; undefined fields are left alone. */
function eventColumns(fields: UpdateEvent) {
  return definedOnly({
    name: fields.name,
    startsAt: fields.startsAt === undefined ? undefined : new Date(fields.startsAt),
    location: fields.location,
    ordersCloseAt: fields.ordersCloseAt === undefined ? undefined : new Date(fields.ordersCloseAt),
    maxToppings: fields.maxToppings,
    noteEn: fields.note === undefined ? undefined : (fields.note?.en ?? null),
    noteSv: fields.note === undefined ? undefined : (fields.note?.sv ?? null),
    askMakeOwn: fields.askMakeOwn,
  });
}

/** Every id must be an ingredient in the pantry, not one that has been archived. */
async function requireUsableIngredients(db: Db, ids: string[]): Promise<string[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return unique;
  const found = await db
    .select({ id: ingredients.id })
    .from(ingredients)
    .where(and(inArray(ingredients.id, unique), isNull(ingredients.archivedAt)));
  if (found.length !== unique.length) {
    throw new ApiHttpError(
      400,
      "validation_failed",
      "The menu has an unknown or archived ingredient.",
    );
  }
  return unique;
}

/** How many are invited to each event, how many said no, and how many ordered. */
async function guestCountsOf(db: Db, eventIds: string[]): Promise<Map<string, GuestCounts>> {
  const counts = new Map<string, GuestCounts>();
  if (eventIds.length === 0) return counts;
  const rows = await db
    .select({
      eventId: eventInvitations.eventId,
      invited: count(),
      declined: count(sql`case when ${eventInvitations.status} = 'declined' then 1 end`),
      ordered: count(orders.id),
    })
    .from(eventInvitations)
    .leftJoin(
      orders,
      and(eq(orders.eventId, eventInvitations.eventId), eq(orders.userId, eventInvitations.userId)),
    )
    .where(inArray(eventInvitations.eventId, eventIds))
    .groupBy(eventInvitations.eventId);
  for (const { eventId, ...c } of rows) counts.set(eventId, c);
  return counts;
}

async function menuOf(db: Db, eventIds: string[]): Promise<Map<string, string[]>> {
  const menus = new Map<string, string[]>(eventIds.map((id) => [id, []]));
  if (eventIds.length === 0) return menus;
  const rows = await db
    .select({ eventId: eventIngredients.eventId, ingredientId: eventIngredients.ingredientId })
    .from(eventIngredients)
    .innerJoin(ingredients, eq(ingredients.id, eventIngredients.ingredientId))
    .where(inArray(eventIngredients.eventId, eventIds))
    .orderBy(asc(ingredients.sort), asc(ingredients.createdAt));
  for (const row of rows) menus.get(row.eventId)?.push(row.ingredientId);
  return menus;
}

async function replaceMenu(db: Db, eventId: string, ingredientIds: string[]) {
  await db.delete(eventIngredients).where(eq(eventIngredients.eventId, eventId));
  if (ingredientIds.length) {
    await db
      .insert(eventIngredients)
      .values(ingredientIds.map((ingredientId) => ({ eventId, ingredientId })));
  }
}

export function eventRoutes(deps: AppDeps) {
  const { db } = deps;
  const routes = new Hono<AppEnv>();

  async function loadEvent(id: string): Promise<EventRow> {
    const [row] = await db.select().from(events).where(eq(events.id, id));
    if (!row) throw notFound("That event");
    return row;
  }

  async function respond(row: EventRow) {
    const menus = await menuOf(db, [row.id]);
    const guests = await guestCountsOf(db, [row.id]);
    return toStaffEvent(row, menus.get(row.id) ?? [], guests.get(row.id) ?? noGuests, deps.now());
  }

  routes.get("/events", async (c) => {
    const rows = await db.select().from(events).orderBy(asc(events.startsAt));
    const menus = await menuOf(
      db,
      rows.map((r) => r.id),
    );
    const guests = await guestCountsOf(
      db,
      rows.map((r) => r.id),
    );
    const now = deps.now();
    return c.json(
      rows.map((r) => toStaffEvent(r, menus.get(r.id) ?? [], guests.get(r.id) ?? noGuests, now)),
    );
  });

  routes.post("/events", async (c) => {
    const { ingredientIds = [], ...fields } = await readJson(c, createEventSchema);
    const menu = await requireUsableIngredients(db, ingredientIds);
    const row = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(events)
        .values({
          name: fields.name,
          startsAt: new Date(fields.startsAt),
          location: fields.location,
          ordersCloseAt: new Date(fields.ordersCloseAt),
          maxToppings: fields.maxToppings,
          noteEn: fields.note?.en ?? null,
          noteSv: fields.note?.sv ?? null,
          askMakeOwn: fields.askMakeOwn,
          createdBy: currentUser(c).id,
        })
        .returning();
      await replaceMenu(tx, created!.id, menu);
      return created!;
    });
    return c.json(await respond(row), 201);
  });

  routes.get("/events/:id", async (c) => c.json(await respond(await loadEvent(idParam(c)))));

  routes.patch("/events/:id", async (c) => {
    const id = idParam(c);
    const fields = await readJson(c, updateEventSchema);
    const current = await loadEvent(id);
    if (current.status === "cancelled") throw conflict("A cancelled event cannot be changed.");
    const times = {
      startsAt: fields.startsAt ?? current.startsAt.toISOString(),
      ordersCloseAt: fields.ordersCloseAt ?? current.ordersCloseAt.toISOString(),
    };
    if (!ordersCloseBeforeStart(times)) {
      throw new ApiHttpError(
        400,
        "validation_failed",
        "Orders must close before the event starts.",
      );
    }
    const [row] = await db
      .update(events)
      .set({ ...eventColumns(fields), updatedAt: deps.now() })
      .where(eq(events.id, id))
      .returning();
    return c.json(await respond(row!));
  });

  routes.put("/events/:id/menu", async (c) => {
    const id = idParam(c);
    const { ingredientIds } = await readJson(c, setMenuSchema);
    const current = await loadEvent(id);
    if (current.status === "cancelled") throw conflict("A cancelled event cannot be changed.");
    const menu = await requireUsableIngredients(db, ingredientIds);
    const row = await db.transaction(async (tx) => {
      await replaceMenu(tx, id, menu);
      const [updated] = await tx
        .update(events)
        .set({ updatedAt: deps.now() })
        .where(eq(events.id, id))
        .returning();
      return updated!;
    });
    return c.json(await respond(row));
  });

  routes.post("/events/:id/publish", async (c) => {
    const id = idParam(c);
    const current = await loadEvent(id);
    if (current.status !== "draft") throw conflict("Only a draft can be published.");
    if (current.ordersCloseAt <= deps.now()) {
      throw conflict("The order deadline has already passed. Move it before publishing.");
    }
    const menu = (await menuOf(db, [id])).get(id) ?? [];
    if (menu.length === 0) throw conflict("Pick at least one ingredient for the menu first.");
    const [row] = await db
      .update(events)
      .set({ status: "published", updatedAt: deps.now() })
      .where(eq(events.id, id))
      .returning();
    return c.json(await respond(row!));
  });

  routes.post("/events/:id/cancel", async (c) => {
    const id = idParam(c);
    const current = await loadEvent(id);
    if (current.status === "cancelled") throw conflict("The event is already cancelled.");
    const [row] = await db
      .update(events)
      .set({ status: "cancelled", updatedAt: deps.now() })
      .where(eq(events.id, id))
      .returning();
    return c.json(await respond(row!));
  });

  routes.delete("/events/:id", async (c) => {
    const id = idParam(c);
    const current = await loadEvent(id);
    if (current.status !== "draft") {
      throw conflict("Only a draft can be deleted. Cancel a published event instead.");
    }
    await db.delete(events).where(eq(events.id, id));
    return c.body(null, 204);
  });

  return routes;
}
