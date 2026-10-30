import type {
  EventGuest,
  EventOrders,
  Favourite,
  Ingredient,
  IngredientGroup,
  Me,
  RemindResult,
  StaffEvent,
} from "@dominos/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sendDueReminders } from "../reminders.ts";
import { Harness, type Browser } from "../test/harness.ts";

const HOUR = 60 * 60 * 1000;
const t = new Harness();
let staff: Browser;
let ham: Ingredient;
let onion: Ingredient;
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
  onion = await staff.json<Ingredient>(
    "POST",
    "/api/staff/ingredients",
    { groupId: veg.id, name: { en: "Onion", sv: "Lök" } },
    201,
  );
  ham = await staff.json<Ingredient>(
    "POST",
    "/api/staff/ingredients",
    { groupId: meat.id, name: { en: "Ham", sv: "Skinka" } },
    201,
  );
  // The harness clock is Mon 2 Nov 2026, 12:00 UTC. Orders close Wed 19:00, the night is Fri.
  const created = await staff.json<StaffEvent>(
    "POST",
    "/api/staff/events",
    {
      name: { en: "Friday Pizza Night", sv: "Fredagspizza" },
      startsAt: "2026-11-06T17:30:00Z",
      location: { en: "At the Kurelids'", sv: "Hos Kurelids" },
      ordersCloseAt: "2026-11-04T19:00:00Z",
      maxToppings: null,
      note: null,
      askMakeOwn: true,
      askSmallerThicker: true,
      ingredientIds: [ham.id, onion.id],
    },
    201,
  );
  event = await staff.json<StaffEvent>("POST", `/api/staff/events/${created.id}/publish`);
});

async function guest(email: string, language: "en" | "sv" = "en") {
  const { user, browser } = await t.signedIn("customer", email);
  if (language === "sv") await browser.json("PATCH", "/api/me", { language });
  await staff.json<EventGuest[]>("POST", `/api/staff/events/${event.id}/invitations`, {
    userIds: [user.id],
  });
  return browser;
}

const order = (
  browser: Browser,
  toppingIds: string[],
  makeOwn = false,
  comment: string | null = null,
) => browser.json("PUT", `/api/events/${event.id}/order`, { toppingIds, makeOwn, comment });

const remind = () =>
  sendDueReminders({
    db: t.db,
    mailer: { send: async (e) => void t.sent.push(e) },
    appOrigin: "https://dominos.test",
    now: t.now,
  });

describe("the orders view", () => {
  it("lists the orders by number and adds up the toppings in menu order", async () => {
    const anna = await guest("anna@example.com");
    const erik = await guest("erik@example.com");
    await guest("sara@example.com");
    await order(anna, [onion.id, ham.id], true, "Extra crispy");
    await erik.json("PUT", `/api/events/${event.id}/order`, {
      toppingIds: [ham.id],
      makeOwn: false,
      smallerThicker: true,
      comment: null,
    });

    const night = await staff.json<EventOrders>("GET", `/api/staff/events/${event.id}/orders`);
    expect(night.pizzas).toBe(2);
    expect(night.makeOwn).toBe(1);
    expect(night.smallerThicker).toBe(1);
    expect(night.prep).toEqual([
      { ingredientId: ham.id, name: { en: "Ham", sv: "Skinka" }, count: 2 },
      { ingredientId: onion.id, name: { en: "Onion", sv: "Lök" }, count: 1 },
    ]);
    expect(night.orders.map((o) => [o.number, o.email, o.toppings.map((n) => n.en)])).toEqual([
      [1, "anna@example.com", ["Ham", "Onion"]],
      [2, "erik@example.com", ["Ham"]],
    ]);
    expect(night.orders[0]).toMatchObject({ makeOwn: true, comment: "Extra crispy", baked: false });
    expect(night.orders[1]).toMatchObject({ makeOwn: false, smallerThicker: true });
  });

  it("ticks pizzas off as baked, and back", async () => {
    const anna = await guest("anna@example.com");
    await order(anna, [ham.id]);
    const [first] = (await staff.json<EventOrders>("GET", `/api/staff/events/${event.id}/orders`))
      .orders;
    expect((await staff.patch(`/api/staff/orders/${first!.id}`, { baked: true })).status).toBe(204);
    let night = await staff.json<EventOrders>("GET", `/api/staff/events/${event.id}/orders`);
    expect(night.orders[0]?.baked).toBe(true);
    await staff.patch(`/api/staff/orders/${first!.id}`, { baked: false });
    night = await staff.json<EventOrders>("GET", `/api/staff/events/${event.id}/orders`);
    expect(night.orders[0]?.baked).toBe(false);
  });

  it("is for staff only", async () => {
    const anna = await guest("anna@example.com");
    expect((await anna.get(`/api/staff/events/${event.id}/orders`)).status).toBe(403);
  });
});

describe("reminding by hand", () => {
  it("emails everyone who has not ordered or said no", async () => {
    const anna = await guest("anna@example.com");
    await guest("erik@example.com");
    const sara = await guest("sara@example.com");
    await order(anna, [ham.id]);
    await sara.json("POST", `/api/events/${event.id}/decline`);
    t.sent = [];

    const result = await staff.json<RemindResult>(
      "POST",
      `/api/staff/events/${event.id}/reminders`,
    );
    expect(result).toEqual({ sent: 1 });
    expect(t.sent.map((e) => e.to)).toEqual(["erik@example.com"]);
    expect(t.sent[0]?.subject).toBe("Pick your toppings: Friday Pizza Night");
    expect(t.sent[0]?.text).toContain(`https://dominos.test/events/${event.id}`);
  });

  it("stops once orders close", async () => {
    await guest("anna@example.com");
    t.now = new Date("2026-11-04T19:00:00Z");
    expect((await staff.post(`/api/staff/events/${event.id}/reminders`)).status).toBe(409);
  });
});

describe("automatic reminders", () => {
  it("go out a day before orders close, once, to those without an order", async () => {
    const anna = await guest("anna@example.com");
    await guest("erik@example.com", "sv");
    await order(anna, [ham.id]);
    t.sent = [];

    expect(await remind()).toBe(0); // Mon 12:00: orders close in more than a day.
    t.now = new Date("2026-11-03T20:00:00Z"); // Tue 20:00: within a day.
    expect(await remind()).toBe(1);
    expect(t.sent[0]).toMatchObject({
      to: "erik@example.com",
      subject: "Välj dina toppings: Fredagspizza",
    });
    expect(await remind()).toBe(0);
  });

  it("go out a day before the event, with the pizza, to those who ordered", async () => {
    const anna = await guest("anna@example.com", "sv");
    await guest("erik@example.com");
    await order(anna, [onion.id, ham.id]);
    t.now = new Date("2026-11-05T18:00:00Z"); // Thu 18:00: orders closed, the night is tomorrow.
    t.sent = [];

    expect(await remind()).toBe(1);
    expect(t.sent[0]?.to).toBe("anna@example.com");
    expect(t.sent[0]?.subject).toBe("Imorgon: Fredagspizza");
    expect(t.sent[0]?.text).toContain("Din pizza: Skinka, Lök.");
    expect(t.sent[0]?.text).toContain("Hos Kurelids");
    expect(await remind()).toBe(0);
  });

  it("respect people who turned them off", async () => {
    const anna = await guest("anna@example.com");
    await anna.json("PATCH", "/api/me", { reminders: { beforeClose: false } });
    t.now = new Date("2026-11-03T20:00:00Z");
    t.sent = [];
    expect(await remind()).toBe(0);
  });

  it("skip someone invited in the last few hours", async () => {
    t.now = new Date("2026-11-04T10:00:00Z"); // Wed 10:00, nine hours before orders close.
    await guest("anna@example.com");
    t.sent = [];
    expect(await remind()).toBe(0);
    t.advance(13 * HOUR);
    expect(await remind()).toBe(0); // Orders have closed by now.
  });

  it("are tried again when sending fails", async () => {
    await guest("anna@example.com");
    t.now = new Date("2026-11-03T20:00:00Z");
    const failing = { send: () => Promise.reject(new Error("SMTP down")) };
    const deps = { db: t.db, appOrigin: "https://dominos.test", now: t.now };
    expect(await sendDueReminders({ ...deps, mailer: failing })).toBe(0);
    t.sent = [];
    expect(await remind()).toBe(1);
  });
});

describe("the profile", () => {
  it("changes name, language and reminders", async () => {
    const { browser } = await t.signedIn("customer", "anna@example.com");
    const me = await browser.json<Me>("PATCH", "/api/me", {
      name: "Anna Berg",
      language: "sv",
      reminders: { dayBefore: false },
    });
    expect(me).toMatchObject({
      name: "Anna Berg",
      language: "sv",
      reminders: { beforeClose: true, dayBefore: false },
    });
    expect(await browser.json<Me>("GET", "/api/me")).toEqual(me);
  });

  it("does not change the email", async () => {
    const { browser } = await t.signedIn("customer", "anna@example.com");
    const me = await browser.json<Me>("PATCH", "/api/me", { email: "other@example.com" });
    expect(me.email).toBe("anna@example.com");
  });

  it("changes the password with the current one, and signs out other devices", async () => {
    const accept = await inviteAndAccept("anna@example.com", "first password");
    const laptop = t.browser();
    await laptop.json("POST", "/api/auth/login", {
      email: "anna@example.com",
      password: "first password",
    });

    const wrong = await accept.request("POST", "/api/me/password", {
      currentPassword: "nope",
      newPassword: "second password",
    });
    expect(wrong.status).toBe(400);
    expect(
      (
        await accept.request("POST", "/api/me/password", {
          currentPassword: "first password",
          newPassword: "second password",
        })
      ).status,
    ).toBe(204);

    expect((await accept.get("/api/me")).status).toBe(200);
    expect((await laptop.get("/api/me")).status).toBe(401);
    const login = (password: string) =>
      t.browser().post("/api/auth/login", { email: "anna@example.com", password });
    expect((await login("first password")).status).toBe(401);
    expect((await login("second password")).status).toBe(200);
  });

  it("keeps a favourite pizza, in menu order, without archived toppings", async () => {
    const { browser } = await t.signedIn("customer", "anna@example.com");
    const saved = await browser.json<Favourite>("PUT", "/api/me/favourite", {
      ingredientIds: [onion.id, ham.id],
    });
    expect(saved.ingredients.map((i) => i.name.en)).toEqual(["Ham", "Onion"]);
    await staff.json("PATCH", `/api/staff/ingredients/${onion.id}`, { archived: true });
    const now = await browser.json<Favourite>("GET", "/api/me/favourite");
    expect(now.ingredients.map((i) => i.name.en)).toEqual(["Ham"]);
  });
});

async function inviteAndAccept(email: string, password: string) {
  await staff.json(
    "POST",
    "/api/staff/people",
    { email, name: "Anna", role: "customer", language: "en" },
    201,
  );
  const token = t.sent.at(-1)!.text.match(/#([A-Za-z0-9_-]+)/)![1];
  const browser = t.browser();
  await browser.json("POST", `/api/auth/invitations/${token}`, { name: "Anna", password });
  return browser;
}
