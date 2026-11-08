import type { GuestEventDetail, SavedPizza, Toppings } from "@dominos/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { anna, fakeApi, ok, renderAccounts } from "../test/fakeApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

const id = "16fd2706-8baf-433b-82eb-8c7fada847da";
const pizzaId = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";
const ham = "c56a4180-65aa-42ec-a945-5fd21dec0538";
const onion = "9c858901-8a57-4791-81fe-4c455b099bc9";
const bacon = "6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b";

const name = (en: string) => ({ en, sv: en });
const usual: SavedPizza = {
  id: pizzaId,
  name: "The usual",
  favourite: false,
  ingredients: [
    { id: ham, name: name("Ham") },
    { id: bacon, name: name("Bacon") },
  ],
};
const item = (itemId: string, en: string) => ({
  id: itemId,
  groupId: "g1",
  name: name(en),
  emoji: null,
});
const groups = [{ id: "g1", name: name("All"), sort: 0 }];

const detail: GuestEventDetail = {
  id,
  name: { en: "Friday Pizza Night", sv: "Fredagspizza" },
  startsAt: "2099-11-06T17:30:00.000Z",
  location: { en: "At home", sv: "Hemma" },
  ordersCloseAt: "2099-11-04T19:00:00.000Z",
  phase: "open",
  invitation: "invited",
  order: null,
  orderToppings: [],
  maxToppings: 4,
  note: null,
  askMakeOwn: false,
  askSmallerThicker: false,
  groups,
  menu: [item(ham, "Ham"), item(onion, "Onion")],
};

describe("saved pizzas in the builder", () => {
  it("fill in the toppings, which can be changed before ordering", async () => {
    const calls = fakeApi({
      "GET /api/me": ok(anna),
      [`GET /api/events/${id}`]: ok(detail),
      "GET /api/me/pizzas": ok([usual]),
      [`PUT /api/events/${id}/order`]: ok(detail),
    });
    renderAccounts(`/events/${id}`);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "The usual" }));
    expect(screen.getByRole("button", { name: /ham/i })).toHaveAttribute("aria-pressed", "true");
    // Bacon is not on this menu, and the guest is told.
    expect(screen.getByRole("status")).toHaveTextContent(/left out.*bacon/i);

    await user.click(screen.getByRole("button", { name: /onion/i }));
    await user.click(screen.getByRole("button", { name: "Place order" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "PUT")?.body).toMatchObject({
        toppingIds: [ham, onion],
      }),
    );
  });

  it("are not offered to someone with none", async () => {
    fakeApi({ "GET /api/me": ok(anna), [`GET /api/events/${id}`]: ok(detail) });
    renderAccounts(`/events/${id}`);
    await screen.findByRole("button", { name: /ham/i });
    expect(screen.queryByText("Start from a saved pizza")).not.toBeInTheDocument();
  });

  it("can be saved by name without sending the order", async () => {
    const calls = fakeApi({
      "GET /api/me": ok(anna),
      [`GET /api/events/${id}`]: ok(detail),
      "POST /api/me/pizzas": ok({ ...usual, name: "Hammy", ingredients: [usual.ingredients[0]] }),
    });
    renderAccounts(`/events/${id}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /ham/i }));
    await user.type(screen.getByLabelText("Save this pizza for later"), "Hammy{Enter}");

    expect(await screen.findByText("Saved as Hammy.")).toBeInTheDocument();
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({
      name: "Hammy",
      ingredientIds: [ham],
      favourite: false,
    });
    expect(calls.some((c) => c.method === "PUT")).toBe(false);
  });

  it("can be saved as the new favourite", async () => {
    const calls = fakeApi({
      "GET /api/me": ok(anna),
      [`GET /api/events/${id}`]: ok(detail),
      "POST /api/me/pizzas": ok(usual),
    });
    renderAccounts(`/events/${id}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("checkbox", { name: "Make this my favourite" }));
    await user.type(screen.getByLabelText("Save this pizza for later"), "Mine");
    await user.click(screen.getByRole("button", { name: "Save pizza" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "POST")?.body).toMatchObject({ favourite: true }),
    );
  });

  it("leave an order already placed alone, even with a favourite", async () => {
    fakeApi({
      "GET /api/me": ok(anna),
      [`GET /api/events/${id}`]: ok({
        ...detail,
        order: {
          number: 1,
          toppingIds: [onion],
          makeOwn: false,
          smallerThicker: false,
          comment: null,
          late: false,
        },
      }),
      "GET /api/me/pizzas": ok([{ ...usual, favourite: true }]),
    });
    renderAccounts(`/events/${id}`);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Change order" }));
    expect(screen.getByRole("button", { name: /onion/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /ham/i })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("saved pizzas on the profile", () => {
  const toppings: Toppings = {
    groups,
    items: [item(ham, "Ham"), item(onion, "Onion"), item(bacon, "Bacon")],
  };

  const card = () => screen.findByRole("region", { name: "My pizzas" });

  it("can be made from scratch", async () => {
    const calls = fakeApi({
      "GET /api/me": ok(anna),
      "GET /api/me/pizzas/toppings": ok(toppings),
      "POST /api/me/pizzas": ok(usual),
    });
    renderAccounts("/profile");
    const user = userEvent.setup();
    await user.click(within(await card()).getByRole("button", { name: "New pizza" }));
    await user.type(screen.getByLabelText("Pizza name"), "Veggie");
    await user.click(await screen.findByRole("button", { name: /onion/i }));
    await user.click(within(await card()).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "POST")?.body).toEqual({
        name: "Veggie",
        ingredientIds: [onion],
      }),
    );
  });

  it("can be renamed and get other toppings", async () => {
    const calls = fakeApi({
      "GET /api/me": ok(anna),
      "GET /api/me/pizzas": ok([usual]),
      "GET /api/me/pizzas/toppings": ok(toppings),
      [`PATCH /api/me/pizzas/${pizzaId}`]: ok(usual),
    });
    renderAccounts("/profile");
    const user = userEvent.setup();
    const pizzas = await card();
    expect(await within(pizzas).findByText("Ham, Bacon")).toBeInTheDocument();
    await user.click(within(pizzas).getByRole("button", { name: "Edit The usual" }));

    const nameInput = screen.getByLabelText("Pizza name");
    await user.clear(nameInput);
    await user.type(nameInput, "Friday");
    await user.click(await screen.findByRole("button", { name: /bacon/i }));
    await user.click(screen.getByRole("button", { name: /onion/i }));
    await user.click(within(await card()).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({
        name: "Friday",
        ingredientIds: [ham, onion],
      }),
    );
  });

  it("show the favourite, and can change it", async () => {
    const calls = fakeApi({
      "GET /api/me": ok(anna),
      "GET /api/me/pizzas": ok([usual, { ...usual, id: "p2", name: "Veggie", favourite: true }]),
      [`PATCH /api/me/pizzas/${pizzaId}`]: ok(usual),
    });
    renderAccounts("/profile");
    const pizzas = await card();
    const veggie = await within(pizzas).findByRole("article", { name: "Veggie" });
    expect(within(veggie).getByText("Favourite")).toBeInTheDocument();
    await userEvent
      .setup()
      .click(within(pizzas).getByRole("button", { name: "Make The usual my favourite" }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ favourite: true }),
    );
  });

  it("are deleted only after asking", async () => {
    const calls = fakeApi({
      "GET /api/me": ok(anna),
      "GET /api/me/pizzas": ok([usual]),
      [`DELETE /api/me/pizzas/${pizzaId}`]: ok(),
    });
    renderAccounts("/profile");
    const user = userEvent.setup();
    const pizzas = await card();
    await user.click(await within(pizzas).findByRole("button", { name: "Delete The usual" }));
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    await user.click(within(pizzas).getByRole("button", { name: "Yes, delete" }));
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE")).toBe(true));
  });
});
