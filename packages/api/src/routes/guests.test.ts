import type {
  EventGuest,
  GuestEvent,
  GuestEventDetail,
  Ingredient,
  IngredientGroup,
  InvitationInfo,
  StaffEvent,
} from "@dominos/shared";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { users } from "../db/schema.ts";
import { Harness, tokenFromEmail, type Browser } from "../test/harness.ts";

const t = new Harness();
let staff: Browser;
let ham: Ingredient;
let onion: Ingredient;
let bacon: Ingredient;
let event: StaffEvent;

beforeAll(() => t.start());
afterAll(() => t.database.close());
beforeEach(async () => {
  await t.reset();
  staff = (await t.signedIn("staff", "baker@example.com")).browser;
  const meat = await staff.json<IngredientGroup>(
    "POST",
    "/api/staff/ingredient-groups",
    { name: { en: "Meat", sv: "Kött" } },
    201,
  );
  const veg = await staff.json<IngredientGroup>(
    "POST",
    "/api/staff/ingredient-groups",
    { name: { en: "Veg", sv: "Grönt" } },
    201,
  );
  const add = (groupId: string, en: string, sv: string) =>
    staff.json<Ingredient>("POST", "/api/staff/ingredients", { groupId, name: { en, sv } }, 201);
  // Added out of menu order on purpose: orders list toppings by group, then pantry order.
  onion = await add(veg.id, "Onion", "Lök");
  ham = await add(meat.id, "Ham", "Skinka");
  bacon = await add(meat.id, "Bacon", "Bacon");
  event = await createEvent();
  t.sent = [];
});

// The harness clock is 2 Nov 2026, 12:00 UTC.
async function createEvent(fields: Record<string, unknown> = {}, publish = true) {
  const created = await staff.json<StaffEvent>(
    "POST",
    "/api/staff/events",
    {
      name: { en: "Friday Pizza Night", sv: "Fredagspizza" },
      startsAt: "2026-11-06T17:30:00Z",
      location: { en: "At the Kurelids'", sv: "Hos Kurelids" },
      ordersCloseAt: "2026-11-04T19:00:00Z",
      maxToppings: 2,
      note: null,
      askMakeOwn: true,
      ingredientIds: [ham.id, onion.id, bacon.id],
      ...fields,
    },
    201,
  );
  return publish
    ? staff.json<StaffEvent>("POST", `/api/staff/events/${created.id}/publish`)
    : created;
}

const invite = (body: Record<string, unknown>, eventId = event.id) =>
  staff.json<EventGuest[]>("POST", `/api/staff/events/${eventId}/invitations`, body);

/** A customer with an account, invited to the event. */
async function guest(email = "anna@example.com") {
  const signedIn = await t.signedIn("customer", email);
  await invite({ userIds: [signedIn.user.id] });
  return signedIn.browser;
}

const order = (browser: Browser, toppingIds: string[], extra: Record<string, unknown> = {}) =>
  browser.request("PUT", `/api/events/${event.id}/order`, {
    toppingIds,
    makeOwn: false,
    comment: null,
    ...extra,
  });

describe("inviting people to an event", () => {
  it("emails someone with an account a link to the event", async () => {
    const { user } = await t.signedIn("customer", "anna@example.com");
    const guests = await invite({ userIds: [user.id], message: "Bring a drink!" });

    expect(guests).toMatchObject([
      { email: "anna@example.com", invitation: "invited", seen: false, ordered: false },
    ]);
    expect(t.sent).toHaveLength(1);
    expect(t.sent[0]?.subject).toBe("You're invited: Friday Pizza Night");
    expect(t.sent[0]?.text).toContain(`https://dominos.test/events/${event.id}`);
    // Exact date wording varies between Node versions; the parts do not.
    expect(t.sent[0]?.text).toMatch(/Friday 6 November\D+18:30, At the Kurelids'/);
    expect(t.sent[0]?.text).toMatch(/Order before Wednesday 4 November\D+20:00/);
    expect(t.sent[0]?.text).toContain("Bring a drink!");
  });

  it("sets up an account for someone new, with the event in the same email", async () => {
    const guests = await invite({
      newPeople: [{ name: "Sven", email: "Sven@Example.com", language: "sv" }],
    });
    expect(guests).toMatchObject([{ email: "sven@example.com", personStatus: "invited" }]);
    expect(t.sent[0]?.subject).toBe("Du är bjuden: Fredagspizza");
    expect(t.sent[0]?.text).toMatch(/fredag 6 november\D+18:30/);
    expect(t.sent[0]?.text).toContain("https://dominos.test/invitation#");

    const token = tokenFromEmail(t.sent[0]);
    const info = await t.browser().json<InvitationInfo>("GET", `/api/auth/invitations/${token}`);
    expect(info.event).toMatchObject({
      id: event.id,
      name: { en: "Friday Pizza Night", sv: "Fredagspizza" },
    });

    const sven = t.browser();
    await sven.json("POST", `/api/auth/invitations/${token}`, {
      name: "Sven",
      password: "pizzapizza",
    });
    const events = await sven.json<GuestEvent[]>("GET", "/api/events");
    expect(events.map((e) => e.id)).toEqual([event.id]);
  });

  it("keeps the first link working when someone new is invited to a second event", async () => {
    await invite({ newPeople: [{ name: "Sven", email: "sven@example.com", language: "en" }] });
    const first = tokenFromEmail(t.sent[0]);
    const second = await createEvent({
      name: { en: "Birthday slice-off", sv: "Födelsedagspizza" },
    });
    const guests = await staff.json<EventGuest[]>("GET", `/api/staff/events/${event.id}/guests`);
    await invite({ userIds: [guests[0]!.userId] }, second.id);
    expect(t.sent).toHaveLength(2);
    expect(t.sent[1]?.text).toContain("/invitation#");

    // Sven opens the first email, not the newest.
    const sven = t.browser();
    await sven.json("POST", `/api/auth/invitations/${first}`, {
      name: "Sven",
      password: "pizzapizza",
    });
    const events = await sven.json<GuestEvent[]>("GET", "/api/events");
    expect(events.map((e) => e.name.en)).toEqual(["Friday Pizza Night", "Birthday slice-off"]);
  });

  it("emails only people not invited before", async () => {
    const { user } = await t.signedIn("customer", "anna@example.com");
    await invite({ userIds: [user.id] });
    await invite({ userIds: [user.id] });
    expect(t.sent).toHaveLength(1);
  });

  it("treats a new person who already has an account like everyone else", async () => {
    await t.signedIn("customer", "anna@example.com");
    await invite({ newPeople: [{ name: "Anna", email: "anna@example.com", language: "en" }] });
    expect(t.sent[0]?.text).toContain(`/events/${event.id}`);
    expect(t.sent[0]?.text).not.toContain("/invitation#");
  });

  it("waits until the event is published and open", async () => {
    const { user } = await t.signedIn("customer");
    const draft = await createEvent({}, false);
    const res = await staff.post(`/api/staff/events/${draft.id}/invitations`, {
      userIds: [user.id],
    });
    expect(res.status).toBe(409);

    t.now = new Date("2026-11-05T00:00:00Z");
    expect(
      (await staff.post(`/api/staff/events/${event.id}/invitations`, { userIds: [user.id] }))
        .status,
    ).toBe(409);
  });

  it("refuses someone disabled", async () => {
    const { user } = await t.signedIn("customer");
    await t.db.update(users).set({ disabledAt: t.now }).where(eq(users.id, user.id));
    const res = await staff.post(`/api/staff/events/${event.id}/invitations`, {
      userIds: [user.id],
    });
    expect(res.status).toBe(400);
  });

  it("is for staff only", async () => {
    const anna = await guest();
    expect((await anna.get(`/api/staff/events/${event.id}/guests`)).status).toBe(403);
  });
});

describe("a guest's events", () => {
  it("are only the ones they are invited to, never drafts", async () => {
    const anna = await guest();
    await createEvent({ name: { en: "Not for Anna", sv: "Inte för Anna" } });
    const events = await anna.json<GuestEvent[]>("GET", "/api/events");
    expect(events.map((e) => e.name.en)).toEqual(["Friday Pizza Night"]);
  });

  it("hide an event they are not invited to", async () => {
    const anna = await guest();
    const other = await createEvent({ name: { en: "Not for Anna", sv: "Inte för Anna" } });
    expect((await anna.get(`/api/events/${other.id}`)).status).toBe(404);
  });

  it("come with the menu in group order, and mark the event seen", async () => {
    const anna = await guest();
    const detail = await anna.json<GuestEventDetail>("GET", `/api/events/${event.id}`);
    expect(detail.groups.map((g) => g.name.en)).toEqual(["Meat", "Veg"]);
    expect(detail.menu.map((m) => m.name.en)).toEqual(["Ham", "Bacon", "Onion"]);
    expect(detail).toMatchObject({ maxToppings: 2, askMakeOwn: true, phase: "open", order: null });

    const guests = await staff.json<EventGuest[]>("GET", `/api/staff/events/${event.id}/guests`);
    expect(guests[0]?.seen).toBe(true);
  });

  it("need someone signed in", async () => {
    expect((await t.browser().get("/api/events")).status).toBe(401);
  });
});

describe("ordering", () => {
  it("places a numbered order that shows in the list", async () => {
    const anna = await guest();
    const res = await order(anna, [onion.id, ham.id], { makeOwn: true, comment: " Extra crispy " });
    expect(res.status).toBe(200);
    const detail = (await res.json()) as GuestEventDetail;
    expect(detail.order).toEqual({
      number: 1,
      toppingIds: [ham.id, onion.id],
      makeOwn: true,
      smallerThicker: false,
      comment: "Extra crispy",
    });

    const [listed] = await anna.json<GuestEvent[]>("GET", "/api/events");
    expect(listed?.orderToppings.map((n) => n.sv)).toEqual(["Skinka", "Lök"]);
  });

  it("numbers orders in the order they come in, and keeps the number on changes", async () => {
    const anna = await guest("anna@example.com");
    const erik = await guest("erik@example.com");
    await order(anna, [ham.id]);
    const second = (await (await order(erik, [onion.id])).json()) as GuestEventDetail;
    expect(second.order?.number).toBe(2);
    const changed = (await (await order(anna, [onion.id])).json()) as GuestEventDetail;
    expect(changed.order).toMatchObject({ number: 1, toppingIds: [onion.id] });
  });

  it("is one pizza per person", async () => {
    const anna = await guest();
    await order(anna, [ham.id]);
    await order(anna, [onion.id]);
    const [counted] = await staff.json<StaffEvent[]>("GET", "/api/staff/events");
    expect(counted?.guests).toEqual({ invited: 1, declined: 0, ordered: 1 });
  });

  it("allows a plain pizza", async () => {
    const anna = await guest();
    expect((await order(anna, [])).status).toBe(200);
  });

  it("keeps to the topping limit", async () => {
    const anna = await guest();
    expect((await order(anna, [ham.id, onion.id, bacon.id])).status).toBe(400);
  });

  it("only takes toppings on this event's menu", async () => {
    const anna = await guest();
    const group = await staff.json<IngredientGroup[]>("GET", "/api/staff/ingredient-groups");
    const olives = await staff.json<Ingredient>(
      "POST",
      "/api/staff/ingredients",
      { groupId: group[0]!.id, name: { en: "Olives", sv: "Oliver" } },
      201,
    );
    expect((await order(anna, [olives.id])).status).toBe(400);
  });

  it("refuses a topping that ran out, unless the order already has it", async () => {
    const anna = await guest();
    await order(anna, [bacon.id]);
    await staff.json("PATCH", `/api/staff/ingredients/${bacon.id}`, { inStock: false });
    expect((await order(anna, [bacon.id, onion.id])).status).toBe(200);

    const erik = await guest("erik@example.com");
    expect((await order(erik, [bacon.id])).status).toBe(400);

    const detail = await erik.json<GuestEventDetail>("GET", `/api/events/${event.id}`);
    expect(detail.menu.find((m) => m.id === bacon.id)?.inStock).toBe(false);
  });

  it("ignores making your own pizza when the event does not ask", async () => {
    event = await createEvent({ askMakeOwn: false });
    const anna = await guest();
    const detail = (await (await order(anna, [], { makeOwn: true })).json()) as GuestEventDetail;
    expect(detail.order?.makeOwn).toBe(false);
  });

  it("takes a smaller, but thicker pizza when the event asks", async () => {
    event = await createEvent({ askSmallerThicker: true });
    const anna = await guest();
    const res = await order(anna, [ham.id], { smallerThicker: true });
    const detail = (await res.json()) as GuestEventDetail;
    expect(detail.askSmallerThicker).toBe(true);
    expect(detail.order?.smallerThicker).toBe(true);
  });

  it("ignores a smaller, but thicker pizza when the event does not ask", async () => {
    expect(event.askSmallerThicker).toBe(false);
    const anna = await guest();
    const res = await order(anna, [], { smallerThicker: true });
    expect(((await res.json()) as GuestEventDetail).order?.smallerThicker).toBe(false);
  });

  it("is closed after the deadline, for changes and withdrawals too", async () => {
    const anna = await guest();
    await order(anna, [ham.id]);
    t.now = new Date("2026-11-04T19:00:00Z");
    expect((await order(anna, [onion.id])).status).toBe(409);
    expect((await anna.delete(`/api/events/${event.id}/order`)).status).toBe(409);
    expect((await anna.post(`/api/events/${event.id}/decline`)).status).toBe(409);
    const detail = await anna.json<GuestEventDetail>("GET", `/api/events/${event.id}`);
    expect(detail).toMatchObject({ phase: "closed", order: { toppingIds: [ham.id] } });
  });

  it("can be withdrawn while orders are open", async () => {
    const anna = await guest();
    await order(anna, [ham.id]);
    const detail = await anna.json<GuestEventDetail>("DELETE", `/api/events/${event.id}/order`);
    expect(detail.order).toBeNull();
  });
});

describe("declining", () => {
  it("drops the order, and ordering again means coming after all", async () => {
    const anna = await guest();
    await guest("erik@example.com");
    await order(anna, [ham.id]);
    const declined = await anna.json<GuestEventDetail>("POST", `/api/events/${event.id}/decline`);
    expect(declined).toMatchObject({ invitation: "declined", order: null });
    let [counted] = await staff.json<StaffEvent[]>("GET", "/api/staff/events");
    expect(counted?.guests).toEqual({ invited: 2, declined: 1, ordered: 0 });

    const back = (await (await order(anna, [onion.id])).json()) as GuestEventDetail;
    expect(back.invitation).toBe("invited");
    [counted] = await staff.json<StaffEvent[]>("GET", "/api/staff/events");
    expect(counted?.guests).toEqual({ invited: 2, declined: 0, ordered: 1 });
  });
});
