import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { anna, fail, fakeApi, ok, renderAccounts } from "./test/fakeApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

const heading = (name: RegExp) => screen.findByRole("heading", { level: 1, name });

describe("signing in", () => {
  it("is where someone signed out lands", async () => {
    fakeApi({});
    renderAccounts("/");
    expect(await heading(/pizza night, sorted/i)).toBeInTheDocument();
    expect(screen.getByText(/invite-only/i)).toBeInTheDocument();
  });

  it("takes the email and password and shows the signed-in screen", async () => {
    const calls = fakeApi({ "POST /api/auth/login": ok(anna) });
    renderAccounts("/sign-in");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/^email/i), "anna@example.com");
    await user.type(screen.getByLabelText(/^password/i), "correct horse");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await heading(/pizza events/i)).toBeInTheDocument();
    expect(calls.filter((c) => c.method !== "GET").at(-1)).toEqual({
      method: "POST",
      path: "/api/auth/login",
      body: { email: "anna@example.com", password: "correct horse" },
    });
  });

  it("says so when the password is wrong", async () => {
    fakeApi({ "POST /api/auth/login": fail(401, "invalid_credentials") });
    renderAccounts("/sign-in");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/^email/i), "anna@example.com");
    await user.type(screen.getByLabelText(/^password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/wrong email or password/i);
  });

  it("asks to wait after too many attempts", async () => {
    fakeApi({ "POST /api/auth/login": fail(429, "rate_limited") });
    renderAccounts("/sign-in");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/^email/i), "anna@example.com");
    await user.type(screen.getByLabelText(/^password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/too many attempts/i);
  });

  it("translates an error already on screen when the language changes", async () => {
    fakeApi({ "POST /api/auth/login": fail(401, "invalid_credentials") });
    renderAccounts("/sign-in");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/^email/i), "anna@example.com");
    await user.type(screen.getByLabelText(/^password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/wrong email or password/i);

    await user.click(screen.getByRole("radio", { name: /svenska/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/fel e-post eller lösenord/i);
  });

  it("is in Swedish when the language is Swedish", async () => {
    fakeApi({});
    renderAccounts("/sign-in", "sv");
    expect(await heading(/pizzakväll, fixat/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logga in/i })).toBeInTheDocument();
  });
});

describe("signed in", () => {
  it("skips the sign-in screen", async () => {
    fakeApi({ "GET /api/me": ok(anna) });
    renderAccounts("/sign-in");
    expect(await heading(/pizza events/i)).toBeInTheDocument();
  });

  it("gives staff a way to the staff console", async () => {
    fakeApi({ "GET /api/me": ok({ ...anna, role: "staff" }) });
    renderAccounts("/");
    await heading(/pizza events/i);
    expect(screen.getByRole("link", { name: "Staff console" })).toHaveAttribute("href", "/staff");
  });

  it("signs out back to the sign-in screen", async () => {
    const calls = fakeApi({ "GET /api/me": ok(anna), "POST /api/auth/logout": ok() });
    renderAccounts("/");
    await userEvent.setup().click(await screen.findByRole("button", { name: /sign out/i }));
    expect(await heading(/pizza night, sorted/i)).toBeInTheDocument();
    expect(calls.some((c) => c.path === "/api/auth/logout")).toBe(true);
  });
});

describe("when the API cannot be reached", () => {
  it("says so and tries again", async () => {
    fakeApi({ "GET /api/me": fail(502, "internal") });
    renderAccounts("/");
    expect(await heading(/can't reach dominos/i)).toBeInTheDocument();

    fakeApi({ "GET /api/me": ok(anna) });
    await userEvent.setup().click(screen.getByRole("button", { name: /try again/i }));
    expect(await heading(/pizza events/i)).toBeInTheDocument();
  });
});

describe("accepting an invitation", () => {
  const invitation = { email: "anna@example.com", name: "Anna" };

  it("shows the email it is for, pre-fills the name, and signs in", async () => {
    const calls = fakeApi({
      "GET /api/auth/invitations/tok123": ok(invitation),
      "POST /api/auth/invitations/tok123": ok({ ...anna, name: "Anna Berg" }),
    });
    renderAccounts("/invitation#tok123");
    const user = userEvent.setup();

    const email = await screen.findByLabelText(/^email/i);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/set up your account/i);
    expect(email).toHaveValue("anna@example.com");
    expect(email).toHaveAttribute("readonly");
    const name = screen.getByLabelText(/your name/i);
    expect(name).toHaveValue("Anna");

    await user.clear(name);
    await user.type(name, "Anna Berg");
    await user.type(screen.getByLabelText(/choose a password/i), "pizzapizza");
    await user.click(screen.getByRole("button", { name: /join/i }));

    expect(await heading(/pizza events/i)).toBeInTheDocument();
    expect(screen.getByText("Hi Anna Berg")).toBeInTheDocument();
    expect(calls.filter((c) => c.method !== "GET").at(-1)?.body).toEqual({
      name: "Anna Berg",
      password: "pizzapizza",
    });
  });

  it("asks for a longer password before sending it", async () => {
    const calls = fakeApi({ "GET /api/auth/invitations/tok123": ok(invitation) });
    renderAccounts("/invitation#tok123");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/choose a password/i), "short");
    // The browser's own minlength check is skipped so the message under the field is tested.
    screen.getByLabelText(/choose a password/i).removeAttribute("minlength");
    await user.click(screen.getByRole("button", { name: /join/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 8 characters/i);
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
  });

  it("explains an expired or used link", async () => {
    fakeApi({ "GET /api/auth/invitations/old": fail(404, "invalid_token") });
    renderAccounts("/invitation#old");
    expect(await heading(/invitation has expired/i)).toBeInTheDocument();
    expect(screen.getByText(/ask the baker/i)).toBeInTheDocument();
  });

  it("explains a link without a token", async () => {
    fakeApi({});
    renderAccounts("/invitation");
    expect(await heading(/invitation has expired/i)).toBeInTheDocument();
  });
});

describe("a forgotten password", () => {
  it("is reached from the sign-in screen and sends a link", async () => {
    const calls = fakeApi({ "POST /api/auth/forgot": ok() });
    renderAccounts("/sign-in");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("link", { name: /forgot password/i }));
    await user.type(await screen.findByLabelText(/^email/i), "anna@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await heading(/check your email/i)).toBeInTheDocument();
    expect(screen.getByText(/anna@example.com has an account/i)).toBeInTheDocument();
    expect(calls.filter((c) => c.method !== "GET").at(-1)?.body).toEqual({
      email: "anna@example.com",
    });
  });

  it("is reset with the emailed link, which signs in", async () => {
    const calls = fakeApi({ "POST /api/auth/reset": ok(anna) });
    renderAccounts("/reset-password#reset1");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/new password/i), "a brand new one");
    await user.click(screen.getByRole("button", { name: /save and sign in/i }));
    expect(await heading(/pizza events/i)).toBeInTheDocument();
    expect(calls.filter((c) => c.method !== "GET").at(-1)?.body).toEqual({
      token: "reset1",
      password: "a brand new one",
    });
  });

  it("offers a new link when the old one has expired", async () => {
    fakeApi({ "POST /api/auth/reset": fail(404, "invalid_token") });
    renderAccounts("/reset-password#old");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/new password/i), "a brand new one");
    await user.click(screen.getByRole("button", { name: /save and sign in/i }));
    expect(await heading(/reset link has expired/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /send a new link/i })).toBeInTheDocument();
  });
});
