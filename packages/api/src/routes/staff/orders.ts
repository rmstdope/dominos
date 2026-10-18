import {
  eventPhase,
  markBakedSchema,
  type EventOrders,
  type RemindResult,
  type StaffOrder,
} from "@dominos/shared";
import { asc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import {
  events,
  ingredientGroups,
  ingredients,
  orderToppings,
  orders,
  users,
} from "../../db/schema.ts";
import type { AppDeps, AppEnv } from "../../http/env.ts";
import { readJson } from "../../http/errors.ts";
import { conflict, idParam, notFound } from "../../http/params.ts";
import { remindNotOrdered } from "../../reminders.ts";

export function orderRoutes(deps: AppDeps) {
  const { db } = deps;
  const routes = new Hono<AppEnv>();

  async function loadEvent(id: string) {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    if (!event) throw notFound("That event");
    return event;
  }

  routes.get("/events/:id/orders", async (c) => {
    const eventId = idParam(c);
    await loadEvent(eventId);
    const rows = await db
      .select({ order: orders, name: users.name, email: users.email })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.userId))
      .where(eq(orders.eventId, eventId))
      .orderBy(asc(orders.number));
    const toppings = rows.length
      ? await db
          .select({
            orderId: orderToppings.orderId,
            id: ingredients.id,
            en: ingredients.nameEn,
            sv: ingredients.nameSv,
          })
          .from(orderToppings)
          .innerJoin(ingredients, eq(ingredients.id, orderToppings.ingredientId))
          .innerJoin(ingredientGroups, eq(ingredientGroups.id, ingredients.groupId))
          .where(
            inArray(
              orderToppings.orderId,
              rows.map((r) => r.order.id),
            ),
          )
          .orderBy(asc(ingredientGroups.sort), asc(ingredients.sort), asc(ingredients.createdAt))
      : [];

    // In menu order, so the prep list reads like the menu.
    const prep = new Map<string, EventOrders["prep"][number]>();
    for (const t of toppings) {
      const line = prep.get(t.id) ?? { ingredientId: t.id, name: { en: t.en, sv: t.sv }, count: 0 };
      line.count += 1;
      prep.set(t.id, line);
    }
    const list: StaffOrder[] = rows.map(({ order, name, email }) => ({
      id: order.id,
      number: order.number,
      name,
      email,
      toppings: toppings.filter((t) => t.orderId === order.id).map((t) => ({ en: t.en, sv: t.sv })),
      makeOwn: order.makeOwn,
      comment: order.comment,
      baked: order.bakedAt !== null,
    }));
    const body: EventOrders = {
      pizzas: list.length,
      makeOwn: list.filter((o) => o.makeOwn).length,
      prep: [...prep.values()],
      orders: list,
    };
    return c.json(body);
  });

  routes.patch("/orders/:id", async (c) => {
    const id = idParam(c);
    const { baked } = await readJson(c, markBakedSchema);
    const [order] = await db
      .update(orders)
      .set({ bakedAt: baked ? deps.now() : null })
      .where(eq(orders.id, id))
      .returning({ id: orders.id });
    if (!order) throw notFound("That order");
    return c.body(null, 204);
  });

  routes.post("/events/:id/reminders", async (c) => {
    const event = await loadEvent(idParam(c));
    if (eventPhase(event, deps.now()) !== "open") {
      throw conflict("Reminders only go out while orders are open.");
    }
    const sent = await remindNotOrdered(
      { db, mailer: deps.mailer, appOrigin: deps.config.appOrigin, now: deps.now() },
      event,
    );
    const body: RemindResult = { sent };
    return c.json(body);
  });

  return routes;
}
