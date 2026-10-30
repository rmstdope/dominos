import type { EventOrders, GuestEventDetail, Me, StaffEvent } from "@dominos/shared";
import { screen, waitFor, within } from "@testing-library/react";
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

describe("the orders view (staff)", () => {
  const baker: Me = { ...anna, role: "staff" };
  const event: StaffEvent = {
    id,
    name: { en: "Friday Pizza Night", sv: "Fredagspizza" },
    startsAt: "2099-11-06T17:30:00.000Z",
    location: { en: "At the Kurelids'", sv: "Hos Kurelids" },
    ordersCloseAt: "2099-11-04T19:00:00.000Z",
    maxToppings: null,
    note: null,
    askMakeOwn: true,
    askSmallerThicker: false,
    status: "published",
    phase: "open",
    ingredientIds: [ham, onion],
    guests: { invited: 5, declined: 1, ordered: 2 },
  };
  const night: EventOrders = {
    pizzas: 2,
    makeOwn: 1,
    smallerThicker: 0,
    prep: [
      { ingredientId: ham, name: { en: "Ham", sv: "Skinka" }, count: 2 },
      { ingredientId: onion, name: { en: "Onion", sv: "Lök" }, count: 1 },
    ],
    orders: [
      {
        id: "o1",
        number: 1,
        name: "Maja",
        email: "maja@example.com",
        toppings: [
          { en: "Ham", sv: "Skinka" },
          { en: "Onion", sv: "Lök" },
        ],
        makeOwn: true,
        smallerThicker: false,
        comment: "Extra crispy",
        baked: false,
      },
      {
        id: "o2",
        number: 2,
        name: "Erik",
        email: "erik@example.com",
        toppings: [],
        makeOwn: false,
        smallerThicker: false,
        comment: null,
        baked: true,
      },
    ],
  };

  it("shows the prep list and the orders, and ticks one off as baked", async () => {
    const calls = fakeApi({
      "GET /api/me": ok(baker),
      [`GET /api/staff/events/${id}`]: ok(event),
      [`GET /api/staff/events/${id}/orders`]: ok(night),
      "PATCH /api/staff/orders/o1": ok(),
    });
    renderAccounts(`/staff/events/${id}/orders`);
    const user = userEvent.setup();

    const prep = await screen.findByRole("region", { name: "Prep list" });
    expect(within(prep).getByText("Ham").nextSibling?.nextSibling).toHaveTextContent("2");
    const maja = screen.getByRole("article", { name: "#01 Maja" });
    expect(within(maja).getByText("Ham, Onion")).toBeInTheDocument();
    expect(within(maja).getByText("Makes own")).toBeInTheDocument();
    expect(within(maja).getByText("“Extra crispy”")).toBeInTheDocument();
    expect(
      within(screen.getByRole("article", { name: "#02 Erik" })).getByText(/plain/i),
    ).toBeInTheDocument();

    await user.click(within(maja).getByRole("checkbox", { name: "Order #01 baked" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ baked: true }),
    );
  });

  it("reminds the people who have not ordered", async () => {
    const calls = fakeApi({
      "GET /api/me": ok(baker),
      [`GET /api/staff/events/${id}`]: ok(event),
      [`GET /api/staff/events/${id}/orders`]: ok(night),
      [`POST /api/staff/events/${id}/reminders`]: ok({ sent: 2 }),
    });
    renderAccounts(`/staff/events/${id}/orders`);
    // 5 invited, 1 said no, 2 ordered: 2 still to order.
    await userEvent
      .setup()
      .click(await screen.findByRole("button", { name: "Remind the 2 who haven't ordered" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Reminders sent to 2 people.");
    expect(calls.some((c) => c.path.endsWith("/reminders"))).toBe(true);
  });
});

describe("the profile", () => {
  it("switches the language for the app and the emails", async () => {
    const calls = fakeApi({
      "GET /api/me": ok(anna),
      "PATCH /api/me": ok({ ...anna, language: "sv" }),
    });
    renderAccounts("/profile");
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText(/language for the app/i), "sv");
    expect(await screen.findByRole("heading", { name: "Min favoritpizza" })).toBeInTheDocument();
    expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ language: "sv" });
  });

  it("turns a reminder off", async () => {
    const calls = fakeApi({
      "GET /api/me": ok(anna),
      "PATCH /api/me": ok({ ...anna, reminders: { beforeClose: true, dayBefore: false } }),
    });
    renderAccounts("/profile");
    const toggle = await screen.findByRole("switch", { name: "Reminder the day before" });
    await userEvent.setup().click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({
      reminders: { dayBefore: false },
    });
  });

  it("says when the current password is wrong", async () => {
    fakeApi({ "GET /api/me": ok(anna), "POST /api/me/password": fail(400, "invalid_credentials") });
    renderAccounts("/profile");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Current password"), "nope");
    await user.type(screen.getByLabelText("New password"), "a brand new one");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The current password is wrong.");
  });

  it("shows the favourite pizza and clears it", async () => {
    const calls = fakeApi({
      "GET /api/me": ok(anna),
      "GET /api/me/favourite": ok({
        ingredients: [{ id: ham, name: { en: "Ham", sv: "Skinka" } }],
      }),
      "PUT /api/me/favourite": ok({ ingredients: [] }),
    });
    renderAccounts("/profile");
    const card = await screen.findByRole("region", { name: "My favourite pizza" });
    expect(await within(card).findByText("Ham")).toBeInTheDocument();
    await userEvent.setup().click(within(card).getByRole("button", { name: "Clear" }));
    expect(await within(card).findByText(/no favourite yet/i)).toBeInTheDocument();
    expect(calls.find((c) => c.method === "PUT")?.body).toEqual({ ingredientIds: [] });
  });
});

describe("the favourite in the pizza builder", () => {
  const detail: GuestEventDetail = {
    id,
    name: { en: "Friday Pizza Night", sv: "Fredagspizza" },
    startsAt: "2099-11-06T17:30:00.000Z",
    location: { en: "At the Kurelids'", sv: "Hos Kurelids" },
    ordersCloseAt: "2099-11-04T19:00:00.000Z",
    phase: "open",
    invitation: "invited",
    order: null,
    orderToppings: [],
    maxToppings: 4,
    note: null,
    askMakeOwn: false,
    askSmallerThicker: false,
    groups: [{ id: "g1", name: { en: "All", sv: "Alla" }, sort: 0 }],
    menu: [
      { id: ham, groupId: "g1", name: { en: "Ham", sv: "Skinka" }, emoji: "🍖", inStock: true },
      { id: bacon, groupId: "g1", name: { en: "Bacon", sv: "Bacon" }, emoji: null, inStock: false },
      { id: onion, groupId: "g1", name: { en: "Onion", sv: "Lök" }, emoji: null, inStock: true },
    ],
  };

  it("starts a new order from it, skipping what is out", async () => {
    fakeApi({
      "GET /api/me": ok(anna),
      [`GET /api/events/${id}`]: ok(detail),
      "GET /api/me/favourite": ok({
        ingredients: [
          { id: ham, name: { en: "Ham", sv: "Skinka" } },
          { id: bacon, name: { en: "Bacon", sv: "Bacon" } },
        ],
      }),
    });
    renderAccounts(`/events/${id}`);
    expect(await screen.findByRole("button", { name: /ham/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /bacon/i })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /onion/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("is saved from the order when asked", async () => {
    const calls = fakeApi({
      "GET /api/me": ok(anna),
      [`GET /api/events/${id}`]: ok(detail),
      [`PUT /api/events/${id}/order`]: ok({
        ...detail,
        order: {
          number: 1,
          toppingIds: [onion],
          makeOwn: false,
          smallerThicker: false,
          comment: null,
        },
      }),
      "PUT /api/me/favourite": ok({
        ingredients: [{ id: onion, name: { en: "Onion", sv: "Lök" } }],
      }),
    });
    renderAccounts(`/events/${id}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Onion" }));
    await user.click(screen.getByRole("checkbox", { name: "Save as my favourite" }));
    await user.click(screen.getByRole("button", { name: "Place order" }));
    await waitFor(() =>
      expect(calls.find((c) => c.path === "/api/me/favourite" && c.method === "PUT")?.body).toEqual(
        {
          ingredientIds: [onion],
        },
      ),
    );
  });
});
