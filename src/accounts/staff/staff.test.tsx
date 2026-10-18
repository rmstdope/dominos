import type { Ingredient, IngredientGroup, Me, Person, StaffEvent } from "@dominos/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { anna, fail, fakeApi, ok, renderAccounts } from "../test/fakeApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

const baker: Me = {
  ...anna,
  id: "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed",
  name: "The Baker",
  email: "baker@example.com",
  role: "staff",
};

const meat: IngredientGroup = {
  id: "6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b",
  name: { en: "Meat", sv: "Kött" },
  sort: 0,
};
const ham: Ingredient = {
  id: "c56a4180-65aa-42ec-a945-5fd21dec0538",
  groupId: meat.id,
  name: { en: "Ham", sv: "Skinka" },
  inStock: true,
  sort: 0,
  archived: false,
};
const bacon: Ingredient = {
  ...ham,
  id: "9c858901-8a57-4791-81fe-4c455b099bc9",
  name: { en: "Bacon", sv: "Bacon" },
  inStock: false,
  sort: 1,
};

const friday: StaffEvent = {
  id: "16fd2706-8baf-433b-82eb-8c7fada847da",
  name: "Friday Pizza Night",
  startsAt: "2099-11-06T17:30:00.000Z",
  location: "At the Kurelids'",
  ordersCloseAt: "2099-11-04T19:00:00.000Z",
  maxToppings: 6,
  note: null,
  askMakeOwn: true,
  status: "draft",
  phase: "draft",
  ingredientIds: [ham.id],
  guests: { invited: 0, declined: 0, ordered: 0 },
};

const staffApi = (routes: Parameters<typeof fakeApi>[0] = {}) =>
  fakeApi({
    "GET /api/me": ok(baker),
    "GET /api/staff/ingredient-groups": ok([meat]),
    "GET /api/staff/ingredients": ok([ham, bacon]),
    ...routes,
  });

const heading = (name: RegExp | string) => screen.findByRole("heading", { level: 1, name });

describe("the staff console", () => {
  it("is closed to customers", async () => {
    fakeApi({ "GET /api/me": ok(anna) });
    renderAccounts("/staff/events");
    expect(await heading(/pizza events/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /staff console/i })).not.toBeInTheDocument();
  });

  it("is linked from a staff member's home screen", async () => {
    staffApi({ "GET /api/staff/events": ok([]) });
    renderAccounts("/");
    await userEvent.setup().click(await screen.findByRole("link", { name: "Staff console" }));
    expect(await heading("Events")).toBeInTheDocument();
    expect(screen.getByText(/no events planned/i)).toBeInTheDocument();
  });
});

describe("the events list", () => {
  it("shows upcoming events with their status, and past ones on request", async () => {
    const open = { ...friday, id: "a1", status: "published", phase: "open" } as const;
    const past = {
      ...friday,
      id: "a2",
      name: "Midsummer pizza",
      status: "published",
      phase: "past",
    } as const;
    staffApi({ "GET /api/staff/events": ok([open, { ...friday, name: "Advent pizza" }, past]) });
    renderAccounts("/staff/events");

    const table = await screen.findByRole("table");
    expect(within(table).getByRole("link", { name: "Friday Pizza Night" })).toBeInTheDocument();
    expect(within(table).getByText("Draft")).toBeInTheDocument();
    expect(within(table).getByText("Orders open")).toBeInTheDocument();
    expect(within(table).queryByText("Midsummer pizza")).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("radio", { name: "Past" }));
    expect(within(screen.getByRole("table")).getByText("Midsummer pizza")).toBeInTheDocument();
  });
});

describe("the event editor", () => {
  it("creates a draft with local times and the in-stock menu", async () => {
    const calls = staffApi({
      "POST /api/staff/events": ok(friday),
      [`GET /api/staff/events/${friday.id}`]: ok(friday),
    });
    renderAccounts("/staff/events/new");
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("Name"), "Friday Pizza Night");
    await user.type(screen.getByLabelText("Date"), "2026-11-06");
    await user.clear(screen.getByLabelText("Starts"));
    await user.type(screen.getByLabelText("Starts"), "18:30");
    await user.type(screen.getByLabelText("Where"), "At the Kurelids'");
    await user.type(screen.getByLabelText("Orders close on"), "2026-11-04");
    await user.type(screen.getByLabelText("Max toppings"), "6");
    // Bacon is out of stock, so it starts unticked.
    expect(screen.getByRole("checkbox", { name: /ham/i })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /bacon/i })).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Create draft" }));

    expect(await heading("Friday Pizza Night")).toBeInTheDocument();
    const created = calls.find((c) => c.method === "POST");
    expect(created?.body).toEqual({
      name: "Friday Pizza Night",
      startsAt: "2026-11-06T17:30:00.000Z",
      location: "At the Kurelids'",
      ordersCloseAt: "2026-11-04T19:00:00.000Z",
      maxToppings: 6,
      note: null,
      askMakeOwn: true,
      ingredientIds: [ham.id],
    });
  });

  it("refuses orders closing after the event starts", async () => {
    const calls = staffApi({ [`GET /api/staff/events/${friday.id}`]: ok(friday) });
    renderAccounts(`/staff/events/${friday.id}`);
    const user = userEvent.setup();
    const closeDate = await screen.findByLabelText("Orders close on");
    await user.clear(closeDate);
    await user.type(closeDate, "2099-11-07");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/orders must close before/i);
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
  });

  it("wants the note in both languages or neither", async () => {
    staffApi({ [`GET /api/staff/events/${friday.id}`]: ok(friday) });
    renderAccounts(`/staff/events/${friday.id}`);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/note to guests · english/i), "Bring a drink");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/both languages/i);
  });

  it("saves changed details and the menu, then publishes", async () => {
    const withBacon = { ...friday, location: "In the garden", ingredientIds: [ham.id, bacon.id] };
    const calls = staffApi({
      [`GET /api/staff/events/${friday.id}`]: ok(friday),
      [`PATCH /api/staff/events/${friday.id}`]: ok({ ...friday, location: "In the garden" }),
      [`PUT /api/staff/events/${friday.id}/menu`]: ok(withBacon),
      [`POST /api/staff/events/${friday.id}/publish`]: ok({
        ...withBacon,
        status: "published",
        phase: "open",
      }),
      "GET /api/staff/events": ok([]),
    });
    renderAccounts(`/staff/events/${friday.id}`);
    const user = userEvent.setup();

    const where = await screen.findByLabelText("Where");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    await user.clear(where);
    await user.type(where, "In the garden");
    await user.click(screen.getByRole("checkbox", { name: /bacon/i }));
    // Publishing waits for the changes to be saved.
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Saved");
    expect(calls.find((c) => c.method === "PATCH")?.body).toMatchObject({
      location: "In the garden",
    });
    expect(calls.find((c) => c.method === "PUT")?.body).toEqual({
      ingredientIds: [ham.id, bacon.id],
    });

    await user.click(screen.getByRole("button", { name: "Publish" }));
    expect(await screen.findByText("Orders open")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
  });

  it("asks before cancelling an event", async () => {
    const calls = staffApi({
      [`GET /api/staff/events/${friday.id}`]: ok(friday),
      [`POST /api/staff/events/${friday.id}/cancel`]: ok({
        ...friday,
        status: "cancelled",
        phase: "cancelled",
      }),
      "GET /api/staff/events": ok([]),
    });
    renderAccounts(`/staff/events/${friday.id}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Cancel event" }));
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(calls.some((c) => c.path.endsWith("/cancel"))).toBe(false);

    await user.click(screen.getByRole("button", { name: "Cancel event" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel it" }));
    expect(await screen.findByText(/can no longer be changed/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Where")).toBeDisabled();
  });
});

describe("the ingredients page", () => {
  it("marks an ingredient out of stock", async () => {
    const calls = staffApi({
      [`PATCH /api/staff/ingredients/${ham.id}`]: ok({ ...ham, inStock: false }),
    });
    renderAccounts("/staff/ingredients");
    await userEvent.setup().click(await screen.findByRole("checkbox", { name: "Ham in stock" }));
    await waitFor(() => expect(calls.at(-2)?.body).toEqual({ inStock: false }));
  });

  it("explains why a group with ingredients cannot be deleted", async () => {
    staffApi({ [`DELETE /api/staff/ingredient-groups/${meat.id}`]: fail(409, "conflict") });
    renderAccounts("/staff/ingredients");
    const groups = await screen.findByRole("region", { name: "Groups" });
    await userEvent.setup().click(within(groups).getByRole("button", { name: "Delete" }));
    expect(await within(groups).findByRole("alert")).toHaveTextContent(/move or archive/i);
  });
});

describe("the people page", () => {
  const me: Person = { ...baker, status: "active" };
  const maja: Person = {
    id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    email: "maja@example.com",
    name: "Maja Lind",
    role: "customer",
    language: "sv",
    status: "invited",
  };

  it("invites someone and confirms it", async () => {
    const calls = staffApi({
      "GET /api/staff/people": ok([me]),
      "POST /api/staff/people": { status: 201, body: maja },
    });
    renderAccounts("/staff/people");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Name"), "Maja Lind");
    await user.type(screen.getByLabelText("Email"), "maja@example.com");
    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Invitation sent to maja@example.com.",
    );
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({
      name: "Maja Lind",
      email: "maja@example.com",
      role: "customer",
      language: "sv",
    });
  });

  it("says when the person already has an account", async () => {
    staffApi({
      "GET /api/staff/people": ok([me]),
      "POST /api/staff/people": fail(409, "conflict"),
    });
    renderAccounts("/staff/people");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Name"), "Maja Lind");
    await user.type(screen.getByLabelText("Email"), "maja@example.com");
    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "maja@example.com already has an account.",
    );
  });

  it("explains that the last staff member cannot step down", async () => {
    staffApi({
      "GET /api/staff/people": ok([me, maja]),
      [`PATCH /api/staff/people/${me.id}`]: fail(409, "conflict"),
    });
    renderAccounts("/staff/people");
    const role = await screen.findByRole("combobox", { name: "Role for The Baker" });
    await userEvent.setup().selectOptions(role, "customer");
    const row = role.closest("tr")!;
    expect(await within(row).findByRole("alert")).toHaveTextContent(/at least one staff member/i);
  });

  it("offers to resend only invitations not yet accepted", async () => {
    staffApi({ "GET /api/staff/people": ok([me, maja]) });
    renderAccounts("/staff/people");
    const majaRow = (await screen.findByText("maja@example.com")).closest("tr")!;
    const meRow = screen.getByText("baker@example.com").closest("tr")!;
    expect(within(majaRow).getByRole("button", { name: "Resend invite" })).toBeInTheDocument();
    expect(within(meRow).queryByRole("button", { name: "Resend invite" })).not.toBeInTheDocument();
    expect(within(meRow).getByText(/you/)).toBeInTheDocument();
  });
});
