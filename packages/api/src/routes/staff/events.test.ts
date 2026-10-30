import type { CreateEvent, Ingredient, IngredientGroup, StaffEvent } from "@dominos/shared";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { events } from "../../db/schema.ts";
import { Harness, type Browser } from "../../test/harness.ts";

const HOUR = 60 * 60 * 1000;
const t = new Harness();
let staff: Browser;
let ham: Ingredient;
let onion: Ingredient;

beforeAll(() => t.start());
afterAll(() => t.database.close());
beforeEach(async () => {
  await t.reset();
  staff = (await t.signedIn("staff")).browser;
  const group = await staff.json<IngredientGroup>(
    "POST",
    "/api/staff/ingredient-groups",
    { name: { en: "All", sv: "Alla" } },
    201,
  );
  const add = (en: string) =>
    staff.json<Ingredient>(
      "POST",
      "/api/staff/ingredients",
      { groupId: group.id, name: { en, sv: en } },
      201,
    );
  ham = await add("Ham");
  onion = await add("Onion");
});

// The harness clock is 2 Nov 2026, 12:00 UTC.
const friday: CreateEvent = {
  name: { en: "Friday Pizza Night", sv: "Fredagspizza" },
  startsAt: "2026-11-06T17:30:00Z",
  location: { en: "At the Kurelids'", sv: "Hos Kurelids" },
  ordersCloseAt: "2026-11-04T19:00:00Z",
  maxToppings: 6,
  note: { en: "Every pizza comes with tomato sauce.", sv: "Alla pizzor har tomatsås." },
  askMakeOwn: true,
};

const create = (fields: Partial<CreateEvent> = {}) =>
  staff.json<StaffEvent>(
    "POST",
    "/api/staff/events",
    { ...friday, ingredientIds: [ham.id, onion.id], ...fields },
    201,
  );

describe("creating events", () => {
  it("saves a draft with its menu", async () => {
    const event = await create();
    expect(event).toMatchObject({
      name: { en: "Friday Pizza Night", sv: "Fredagspizza" },
      startsAt: "2026-11-06T17:30:00.000Z",
      ordersCloseAt: "2026-11-04T19:00:00.000Z",
      maxToppings: 6,
      status: "draft",
      phase: "draft",
      ingredientIds: [ham.id, onion.id],
    });
    expect(await staff.json<StaffEvent>("GET", `/api/staff/events/${event.id}`)).toEqual(event);
  });

  it("needs the name and the place in both languages", async () => {
    const res = await staff.post("/api/staff/events", {
      ...friday,
      name: { en: "Friday Pizza Night", sv: " " },
    });
    expect(res.status).toBe(400);
  });

  it("uses the English name and place in Swedish on an event an older version saved", async () => {
    const event = await create();
    await t.db
      .update(events)
      .set({ nameSv: null, locationSv: null })
      .where(eq(events.id, event.id));
    expect(await staff.json<StaffEvent>("GET", `/api/staff/events/${event.id}`)).toMatchObject({
      name: { en: "Friday Pizza Night", sv: "Friday Pizza Night" },
      location: { en: "At the Kurelids'", sv: "At the Kurelids'" },
    });
  });

  it("allows no topping limit and no note", async () => {
    const event = await create({ maxToppings: null, note: null });
    expect(event.maxToppings).toBeNull();
    expect(event.note).toBeNull();
  });

  it("needs orders to close before the event starts", async () => {
    const res = await staff.post("/api/staff/events", {
      ...friday,
      ordersCloseAt: "2026-11-07T00:00:00Z",
    });
    expect(res.status).toBe(400);
  });

  it("needs times with a time zone", async () => {
    const res = await staff.post("/api/staff/events", { ...friday, startsAt: "2026-11-06 18:30" });
    expect(res.status).toBe(400);
  });

  it("refuses an archived ingredient on the menu", async () => {
    await staff.json("PATCH", `/api/staff/ingredients/${onion.id}`, { archived: true });
    const res = await staff.post("/api/staff/events", { ...friday, ingredientIds: [onion.id] });
    expect(res.status).toBe(400);
  });

  it("lists events soonest first", async () => {
    await create({ name: { en: "Later", sv: "Senare" }, startsAt: "2026-12-01T17:00:00Z" });
    await create({ name: { en: "Sooner", sv: "Tidigare" } });
    const events = await staff.json<StaffEvent[]>("GET", "/api/staff/events");
    expect(events.map((e) => e.name.en)).toEqual(["Sooner", "Later"]);
  });
});

describe("editing events", () => {
  it("changes only the fields sent", async () => {
    const event = await create();
    const edited = await staff.json<StaffEvent>("PATCH", `/api/staff/events/${event.id}`, {
      location: { en: "In the garden", sv: "I trädgården" },
    });
    expect(edited).toEqual({ ...event, location: { en: "In the garden", sv: "I trädgården" } });
  });

  it("checks the times against what is already saved", async () => {
    const event = await create();
    const res = await staff.patch(`/api/staff/events/${event.id}`, {
      startsAt: "2026-11-04T18:00:00Z",
    });
    expect(res.status).toBe(400);
  });

  it("replaces the menu", async () => {
    const event = await create();
    const edited = await staff.json<StaffEvent>("PUT", `/api/staff/events/${event.id}/menu`, {
      ingredientIds: [onion.id, onion.id],
    });
    expect(edited.ingredientIds).toEqual([onion.id]);
  });
});

describe("the life of an event", () => {
  it("opens for orders when published, closes at the deadline, and is past once it starts", async () => {
    const event = await create();
    const published = await staff.json<StaffEvent>("POST", `/api/staff/events/${event.id}/publish`);
    expect(published).toMatchObject({ status: "published", phase: "open" });

    t.now = new Date("2026-11-04T19:00:00Z");
    expect((await staff.json<StaffEvent>("GET", `/api/staff/events/${event.id}`)).phase).toBe(
      "closed",
    );
    t.now = new Date("2026-11-06T17:30:00Z");
    expect((await staff.json<StaffEvent>("GET", `/api/staff/events/${event.id}`)).phase).toBe(
      "past",
    );
  });

  it("is not published without a menu", async () => {
    const event = await create({ ingredientIds: [] });
    expect((await staff.post(`/api/staff/events/${event.id}/publish`)).status).toBe(409);
  });

  it("is not published once its deadline has passed", async () => {
    const event = await create();
    t.advance(3 * 24 * HOUR);
    expect((await staff.post(`/api/staff/events/${event.id}/publish`)).status).toBe(409);
  });

  it("is published only once", async () => {
    const event = await create();
    await staff.json("POST", `/api/staff/events/${event.id}/publish`);
    expect((await staff.post(`/api/staff/events/${event.id}/publish`)).status).toBe(409);
  });

  it("can be cancelled, and is then frozen", async () => {
    const event = await create();
    await staff.json("POST", `/api/staff/events/${event.id}/publish`);
    const cancelled = await staff.json<StaffEvent>("POST", `/api/staff/events/${event.id}/cancel`);
    expect(cancelled).toMatchObject({ status: "cancelled", phase: "cancelled" });
    expect(
      (await staff.patch(`/api/staff/events/${event.id}`, { name: { en: "Again", sv: "Igen" } }))
        .status,
    ).toBe(409);
    expect(
      (await staff.put(`/api/staff/events/${event.id}/menu`, { ingredientIds: [] })).status,
    ).toBe(409);
  });

  it("can be deleted only as a draft", async () => {
    const draft = await create();
    expect((await staff.delete(`/api/staff/events/${draft.id}`)).status).toBe(204);
    expect((await staff.get(`/api/staff/events/${draft.id}`)).status).toBe(404);

    const published = await create();
    await staff.json("POST", `/api/staff/events/${published.id}/publish`);
    expect((await staff.delete(`/api/staff/events/${published.id}`)).status).toBe(409);
  });

  it("keeps an ingredient on the menu from being deleted with its group", async () => {
    await create();
    const res = await staff.delete(`/api/staff/ingredient-groups/${ham.groupId}`);
    expect(res.status).toBe(409);
  });
});
