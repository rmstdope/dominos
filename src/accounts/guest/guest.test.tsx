import type { EventGuest, GuestEvent, GuestEventDetail, Person, StaffEvent } from "@dominos/shared";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { anna, fail, fakeApi, ok, renderAccounts } from "../test/fakeApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

const id = "16fd2706-8baf-433b-82eb-8c7fada847da";
const ham = "c56a4180-65aa-42ec-a945-5fd21dec0538";
const onion = "9c858901-8a57-4791-81fe-4c455b099bc9";
const bacon = "6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b";

const base: GuestEvent = {
  id,
  name: "Friday Pizza Night",
  startsAt: "2099-11-06T17:30:00.000Z",
  location: "At the Kurelids'",
  ordersCloseAt: "2099-11-04T19:00:00.000Z",
  phase: "open",
  invitation: "invited",
  order: null,
  orderToppings: [],
};

const detail = (over: Partial<GuestEventDetail> = {}): GuestEventDetail => ({
  ...base,
  maxToppings: 2,
  note: { en: "Every pizza comes with tomato sauce.", sv: "Alla pizzor har tomatsås." },
  askMakeOwn: true,
  groups: [
    { id: "g1", name: { en: "Meat", sv: "Kött" }, sort: 0 },
    { id: "g2", name: { en: "Veg", sv: "Grönt" }, sort: 1 },
  ],
  menu: [
    { id: ham, groupId: "g1", name: { en: "Ham", sv: "Skinka" }, emoji: "🍖", inStock: true },
    { id: bacon, groupId: "g1", name: { en: "Bacon", sv: "Bacon" }, emoji: null, inStock: false },
    { id: onion, groupId: "g2", name: { en: "Onion", sv: "Lök" }, emoji: null, inStock: true },
  ],
  ...over,
});

const ordered = (toppingIds: string[], extra: Partial<GuestEventDetail> = {}) =>
  detail({
    order: { number: 7, toppingIds, makeOwn: true, comment: "Extra crispy" },
    orderToppings: toppingIds.map((t) =>
      t === ham ? { en: "Ham", sv: "Skinka" } : { en: "Onion", sv: "Lök" },
    ),
    ...extra,
  });

const heading = (name: RegExp | string) => screen.findByRole("heading", { level: 1, name });

describe("a guest's events", () => {
  it("say which need an order, which are ordered and which they said no to", async () => {
    fakeApi({
      "GET /api/me": ok(anna),
      "GET /api/events": ok([
        base,
        {
          ...base,
          id: "e2",
          name: "Birthday slice-off",
          order: ordered([ham]).order,
          orderToppings: [{ en: "Ham", sv: "Skinka" }],
        },
        { ...base, id: "e3", name: "Advent pizza", invitation: "declined" },
        { ...base, id: "e4", name: "Midsummer pizza", phase: "past" },
      ]),
    });
    renderAccounts("/");
    expect(await heading("Pizza events")).toBeInTheDocument();
    expect(screen.getByText("Hi Anna")).toBeInTheDocument();

    const needs = await screen.findByRole("region", { name: "Needs your order" });
    expect(within(needs).getByText("Friday Pizza Night")).toBeInTheDocument();
    expect(within(needs).getByRole("link", { name: /build my pizza/i })).toHaveAttribute(
      "href",
      `/events/${id}`,
    );

    const done = screen.getByRole("region", { name: "Ordered" });
    expect(within(done).getByText("Ordered #07")).toBeInTheDocument();
    expect(within(done).getByText(/ham · making it myself/i)).toBeInTheDocument();

    const no = screen.getByRole("region", { name: "Not going" });
    expect(within(no).getByRole("link", { name: /come after all/i })).toBeInTheDocument();

    expect(
      within(screen.getByRole("region", { name: "Past" })).getByText("Midsummer pizza"),
    ).toBeInTheDocument();
  });

  it("explain what happens when there are none yet", async () => {
    fakeApi({ "GET /api/me": ok(anna) });
    renderAccounts("/");
    expect(await screen.findByText("No pizza nights yet")).toBeInTheDocument();
  });
});

describe("building a pizza", () => {
  it("picks toppings up to the limit, skips the ones out, and places the order", async () => {
    const calls = fakeApi({
      "GET /api/me": ok(anna),
      [`GET /api/events/${id}`]: ok(detail()),
      [`PUT /api/events/${id}/order`]: ok(ordered([ham, onion])),
    });
    renderAccounts(`/events/${id}`);
    const user = userEvent.setup();

    expect(await heading("Build your pizza")).toBeInTheDocument();
    expect(
      screen.getByText(/pick up to 2 toppings\. every pizza comes with tomato sauce/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bacon/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Ham" }));
    await user.click(screen.getByRole("button", { name: "Onion" }));
    expect(screen.getByRole("button", { name: /ham/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/that's the maximum/i)).toBeInTheDocument();
    expect(screen.getByText("2 of 2 toppings")).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: /make it myself/i }));
    await user.type(screen.getByLabelText(/note to the baker/i), "Extra crispy");
    await user.click(screen.getByRole("button", { name: "Place order" }));

    expect(await heading("You're on the list, Anna")).toBeInTheDocument();
    const ticket = screen.getByRole("article", { name: "Your order" });
    expect(within(ticket).getByText("#07")).toBeInTheDocument();
    expect(within(ticket).getByText("Ham")).toBeInTheDocument();
    expect(calls.find((c) => c.method === "PUT")?.body).toEqual({
      toppingIds: [ham, onion],
      makeOwn: true,
      comment: "Extra crispy",
    });
  });

  it("changes an order, starting from what was ordered", async () => {
    const calls = fakeApi({
      "GET /api/me": ok(anna),
      [`GET /api/events/${id}`]: ok(ordered([ham])),
      [`PUT /api/events/${id}/order`]: ok(ordered([onion])),
    });
    renderAccounts(`/events/${id}`);
    const user = userEvent.setup();
    expect(await heading("Your order")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Change order" }));
    expect(screen.getByRole("button", { name: /ham/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText(/note to the baker/i)).toHaveValue("Extra crispy");
    await user.click(screen.getByRole("button", { name: /ham/i }));
    await user.click(screen.getByRole("button", { name: "Onion" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await heading(/on the list/i)).toBeInTheDocument();
    expect(calls.find((c) => c.method === "PUT")?.body).toMatchObject({ toppingIds: [onion] });
  });

  it("says so when orders closed before the order went through", async () => {
    fakeApi({
      "GET /api/me": ok(anna),
      [`GET /api/events/${id}`]: ok(detail()),
      [`PUT /api/events/${id}/order`]: fail(409, "conflict"),
    });
    renderAccounts(`/events/${id}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Ham" }));
    await user.click(screen.getByRole("button", { name: "Place order" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/orders closed before/i);
  });
});

describe("declining", () => {
  it("asks first, then offers to come after all", async () => {
    const calls = fakeApi({
      "GET /api/me": ok(anna),
      [`GET /api/events/${id}`]: ok(ordered([ham])),
      [`POST /api/events/${id}/decline`]: ok(detail({ invitation: "declined" })),
    });
    renderAccounts(`/events/${id}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Can't make it" }));
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(calls.some((c) => c.method === "POST")).toBe(false);

    await user.click(screen.getByRole("button", { name: "Can't make it" }));
    await user.click(screen.getByRole("button", { name: /yes, i can't come/i }));
    expect(await heading("You said you can't make it")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /come after all/i }));
    expect(await heading("Build your pizza")).toBeInTheDocument();
  });
});

describe("after orders close", () => {
  it("shows the order without ways to change it", async () => {
    fakeApi({
      "GET /api/me": ok(anna),
      [`GET /api/events/${id}`]: ok(ordered([ham], { phase: "closed" })),
    });
    renderAccounts(`/events/${id}`);
    expect(await heading("Your order")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change order" })).not.toBeInTheDocument();
  });

  it("says when no order was placed", async () => {
    fakeApi({
      "GET /api/me": ok(anna),
      [`GET /api/events/${id}`]: ok(detail({ phase: "closed" })),
    });
    renderAccounts(`/events/${id}`);
    expect(await heading("Orders are closed")).toBeInTheDocument();
  });
});

describe("inviting guests to an event (staff)", () => {
  const baker = { ...anna, id: "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed", role: "staff" as const };
  const event: StaffEvent = {
    id,
    name: "Friday Pizza Night",
    startsAt: "2099-11-06T17:30:00.000Z",
    location: "At the Kurelids'",
    ordersCloseAt: "2099-11-04T19:00:00.000Z",
    maxToppings: 2,
    note: null,
    askMakeOwn: true,
    status: "published",
    phase: "open",
    ingredientIds: [ham],
    guests: { invited: 1, declined: 0, ordered: 1 },
  };
  const maja: Person = {
    id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    email: "maja@example.com",
    name: "Maja Lind",
    role: "customer",
    language: "sv",
    status: "active",
  };
  const erik: EventGuest = {
    userId: "e1",
    name: "Erik",
    email: "erik@example.com",
    personStatus: "active",
    invitation: "invited",
    invitedAt: "2099-01-01T00:00:00Z",
    seen: true,
    ordered: true,
  };

  it("lists the guests and invites people with an account and someone new", async () => {
    const calls = fakeApi({
      "GET /api/me": ok(baker),
      "GET /api/staff/ingredient-groups": ok([]),
      "GET /api/staff/ingredients": ok([]),
      [`GET /api/staff/events/${id}`]: ok(event),
      [`GET /api/staff/events/${id}/guests`]: ok([erik]),
      "GET /api/staff/people": ok([
        maja,
        { ...maja, id: "e1", name: "Erik", email: "erik@example.com" },
      ]),
      [`POST /api/staff/events/${id}/invitations`]: ok([erik]),
      "GET /api/staff/events": ok([event]),
    });
    renderAccounts(`/staff/events/${id}`);
    const user = userEvent.setup();

    const guests = await screen.findByRole("region", { name: "Guests" });
    expect(within(guests).getByText("1 invited · 1 ordered · 0 can't come")).toBeInTheDocument();
    expect(await within(guests).findByText("Ordered")).toBeInTheDocument();
    const majaBox = await within(guests).findByRole("checkbox", { name: /maja lind/i });
    // Erik is already invited, so only Maja is offered.
    expect(within(guests).queryByRole("checkbox", { name: /erik/i })).not.toBeInTheDocument();

    await user.click(majaBox);
    await user.type(within(guests).getByRole("textbox", { name: "Name" }), "Sven");
    await user.type(within(guests).getByRole("textbox", { name: "Email" }), "sven@example.com");
    await user.click(within(guests).getByRole("button", { name: "Send 2 invitations" }));

    expect(await within(guests).findByRole("status")).toHaveTextContent("2 invitations sent.");
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({
      userIds: [maja.id],
      newPeople: [{ name: "Sven", email: "sven@example.com", language: "sv" }],
    });
  });
});
