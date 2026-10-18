import type { ApiError, Me } from "@dominos/shared";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { inviteUser } from "../auth/accounts.ts";
import { users } from "../db/schema.ts";
import { Harness, tokenFromEmail } from "../test/harness.ts";

const DAY = 24 * 60 * 60 * 1000;
const t = new Harness();

beforeAll(() => t.start());
afterAll(() => t.database.close());
beforeEach(() => t.reset());

async function invite(email = "anna@example.com", role: "customer" | "staff" = "customer") {
  return inviteUser(t.db, { email, name: "Anna", role, language: "en" }, t.now);
}

/** An account that has accepted its invitation, and a browser signed in as it. */
async function activeUser(email = "anna@example.com", password = "correct horse") {
  const { token } = await invite(email);
  const browser = t.browser();
  const res = await browser.post(`/api/auth/invitations/${token}`, { name: "Anna", password });
  expect(res.status).toBe(200);
  return browser;
}

async function errorCode(res: Response) {
  return ((await res.json()) as ApiError).error.code;
}

describe("accepting an invitation", () => {
  it("shows who the invitation is for", async () => {
    const { token } = await invite();
    const res = await t.browser().get(`/api/auth/invitations/${token}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ email: "anna@example.com", name: "Anna" });
  });

  it("sets the name and password and signs the person in", async () => {
    const { token } = await invite();
    const browser = t.browser();
    const res = await browser.post(`/api/auth/invitations/${token}`, {
      name: "Anna Berg",
      password: "correct horse",
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as Me).name).toBe("Anna Berg");

    const me = await browser.get("/api/me");
    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ email: "anna@example.com", role: "customer" });
  });

  it("sets a session cookie the page's JavaScript cannot read", async () => {
    const { token } = await invite();
    const res = await t.browser().post(`/api/auth/invitations/${token}`, {
      name: "Anna",
      password: "correct horse",
    });
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^dominos_session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=Lax/);
  });

  it("works only once", async () => {
    const { token } = await invite();
    const body = { name: "Anna", password: "correct horse" };
    expect((await t.browser().post(`/api/auth/invitations/${token}`, body)).status).toBe(200);
    const again = await t.browser().post(`/api/auth/invitations/${token}`, body);
    expect(again.status).toBe(404);
    expect(await errorCode(again)).toBe("invalid_token");
    expect((await t.browser().get(`/api/auth/invitations/${token}`)).status).toBe(404);
  });

  it("expires after 7 days", async () => {
    const { token } = await invite();
    t.advance(7 * DAY + 1);
    const res = await t.browser().post(`/api/auth/invitations/${token}`, {
      name: "Anna",
      password: "correct horse",
    });
    expect(res.status).toBe(404);
  });

  it("stops working when a newer invitation is sent", async () => {
    const { token: first } = await invite();
    const { token: second } = await invite();
    expect((await t.browser().get(`/api/auth/invitations/${first}`)).status).toBe(404);
    expect((await t.browser().get(`/api/auth/invitations/${second}`)).status).toBe(200);
  });

  it("refuses a password shorter than 8 characters", async () => {
    const { token } = await invite();
    const res = await t.browser().post(`/api/auth/invitations/${token}`, {
      name: "Anna",
      password: "short",
    });
    expect(res.status).toBe(400);
    expect(await errorCode(res)).toBe("validation_failed");
  });

  it("does not work for a disabled account", async () => {
    const { token, user } = await invite();
    await t.db.update(users).set({ disabledAt: t.now }).where(eq(users.id, user.id));
    expect((await t.browser().get(`/api/auth/invitations/${token}`)).status).toBe(404);
  });
});

describe("signing in", () => {
  it("works with the right email and password", async () => {
    await activeUser();
    const browser = t.browser();
    const res = await browser.post("/api/auth/login", {
      email: "anna@example.com",
      password: "correct horse",
    });
    expect(res.status).toBe(200);
    expect((await browser.get("/api/me")).status).toBe(200);
  });

  it("ignores case and spaces in the email", async () => {
    await activeUser();
    const res = await t.browser().post("/api/auth/login", {
      email: "  Anna@Example.COM ",
      password: "correct horse",
    });
    expect(res.status).toBe(200);
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    await activeUser();
    const wrong = await t.browser().post("/api/auth/login", {
      email: "anna@example.com",
      password: "wrong password",
    });
    const unknown = await t.browser().post("/api/auth/login", {
      email: "nobody@example.com",
      password: "wrong password",
    });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(await wrong.json()).toEqual(await unknown.json());
  });

  it("is refused for someone who has not accepted their invitation", async () => {
    await invite();
    const res = await t.browser().post("/api/auth/login", {
      email: "anna@example.com",
      password: "anything at all",
    });
    expect(res.status).toBe(401);
  });

  it("is refused for a disabled account, and its sessions stop working", async () => {
    const browser = await activeUser();
    await t.db.update(users).set({ disabledAt: t.now }).where(eq(users.email, "anna@example.com"));
    expect((await browser.get("/api/me")).status).toBe(401);
    const res = await t.browser().post("/api/auth/login", {
      email: "anna@example.com",
      password: "correct horse",
    });
    expect(res.status).toBe(401);
  });

  it("stops one email being guessed at after 10 tries in 15 minutes", async () => {
    await activeUser();
    const attempt = () =>
      t.browser().post("/api/auth/login", { email: "anna@example.com", password: "guess" });
    for (let i = 0; i < 10; i++) expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(await errorCode(blocked)).toBe("rate_limited");

    t.advance(15 * 60 * 1000);
    expect((await attempt()).status).toBe(401);
  });
});

describe("sessions", () => {
  it("are needed to see who you are", async () => {
    const res = await t.browser().get("/api/me");
    expect(res.status).toBe(401);
    expect(await errorCode(res)).toBe("unauthorized");
  });

  it("end on sign out, on the server too", async () => {
    const browser = await activeUser();
    const stolen = new Map(browser.cookies);
    expect((await browser.post("/api/auth/logout")).status).toBe(204);
    expect((await browser.get("/api/me")).status).toBe(401);

    const thief = t.browser();
    thief.cookies = stolen;
    expect((await thief.get("/api/me")).status).toBe(401);
  });

  it("expire after 30 days without use", async () => {
    const browser = await activeUser();
    t.advance(30 * DAY + 1);
    expect((await browser.get("/api/me")).status).toBe(401);
  });

  it("stay alive while they are used", async () => {
    const browser = await activeUser();
    for (let week = 0; week < 8; week++) {
      t.advance(7 * DAY);
      expect((await browser.get("/api/me")).status).toBe(200);
    }
  });

  it("are replaced when signing in again", async () => {
    const browser = await activeUser();
    const before = browser.cookies.get("dominos_session");
    await browser.post("/api/auth/login", { email: "anna@example.com", password: "correct horse" });
    expect(browser.cookies.get("dominos_session")).not.toBe(before);

    const old = t.browser();
    old.cookies.set("dominos_session", before ?? "");
    expect((await old.get("/api/me")).status).toBe(401);
  });
});

describe("resetting a forgotten password", () => {
  it("emails a link that sets a new password", async () => {
    await activeUser();
    const res = await t.browser().post("/api/auth/forgot", { email: "anna@example.com" });
    expect(res.status).toBe(204);
    await t.settle();
    expect(t.sent).toHaveLength(1);
    expect(t.sent[0]?.to).toBe("anna@example.com");
    expect(t.sent[0]?.text).toContain("https://dominos.test/reset-password#");

    const browser = t.browser();
    const reset = await browser.post("/api/auth/reset", {
      token: tokenFromEmail(t.sent[0]),
      password: "a brand new one",
    });
    expect(reset.status).toBe(200);
    expect((await browser.get("/api/me")).status).toBe(200);

    const login = (password: string) =>
      t.browser().post("/api/auth/login", { email: "anna@example.com", password });
    expect((await login("correct horse")).status).toBe(401);
    expect((await login("a brand new one")).status).toBe(200);
  });

  it("answers the same for an unknown email, and sends nothing", async () => {
    const res = await t.browser().post("/api/auth/forgot", { email: "nobody@example.com" });
    expect(res.status).toBe(204);
    await t.settle();
    expect(t.sent).toHaveLength(0);
  });

  it("sends nothing to someone still to accept their invitation", async () => {
    await invite();
    await t.browser().post("/api/auth/forgot", { email: "anna@example.com" });
    await t.settle();
    expect(t.sent).toHaveLength(0);
  });

  it("signs out every other session", async () => {
    const laptop = await activeUser();
    await t.browser().post("/api/auth/forgot", { email: "anna@example.com" });
    await t.settle();
    await t.browser().post("/api/auth/reset", {
      token: tokenFromEmail(t.sent[0]),
      password: "a brand new one",
    });
    expect((await laptop.get("/api/me")).status).toBe(401);
  });

  it("uses a link that works once and for 1 hour", async () => {
    await activeUser();
    const request = async () => {
      t.sent = [];
      await t.browser().post("/api/auth/forgot", { email: "anna@example.com" });
      await t.settle();
      return tokenFromEmail(t.sent[0]);
    };
    const reset = (token: string) =>
      t.browser().post("/api/auth/reset", { token, password: "a brand new one" });

    const once = await request();
    expect((await reset(once)).status).toBe(200);
    expect((await reset(once)).status).toBe(404);

    const late = await request();
    t.advance(60 * 60 * 1000 + 1);
    expect((await reset(late)).status).toBe(404);
  });

  it("makes earlier reset links stop working once one is used", async () => {
    await activeUser();
    await t.browser().post("/api/auth/forgot", { email: "anna@example.com" });
    await t.browser().post("/api/auth/forgot", { email: "anna@example.com" });
    await t.settle();
    const [first, second] = t.sent.map(tokenFromEmail);
    const reset = (token = "") =>
      t.browser().post("/api/auth/reset", { token, password: "a brand new one" });
    expect((await reset(second)).status).toBe(200);
    expect((await reset(first)).status).toBe(404);
  });

  it("sends at most 3 emails an hour to one address", async () => {
    await activeUser();
    for (let i = 0; i < 5; i++) {
      expect(
        (await t.browser().post("/api/auth/forgot", { email: "anna@example.com" })).status,
      ).toBe(204);
    }
    await t.settle();
    expect(t.sent).toHaveLength(3);
  });

  it("writes the email in the person's language", async () => {
    const { token } = await inviteUser(
      t.db,
      { email: "sven@example.com", name: "Sven", role: "customer", language: "sv" },
      t.now,
    );
    await t
      .browser()
      .post(`/api/auth/invitations/${token}`, { name: "Sven", password: "korrekt häst" });
    await t.browser().post("/api/auth/forgot", { email: "sven@example.com" });
    await t.settle();
    expect(t.sent[0]?.subject).toBe("Återställ ditt Dominos-lösenord");
  });
});

describe("requests from other sites", () => {
  it("cannot sign out with a form post", async () => {
    const browser = await activeUser();
    const res = await browser.request("POST", "/api/auth/logout", undefined, {
      origin: "https://evil.example",
      "content-type": "application/x-www-form-urlencoded",
    });
    expect(res.status).toBe(403);
    expect((await browser.get("/api/me")).status).toBe(200);
  });

  it("cannot sign in with a form post", async () => {
    await activeUser();
    const res = await t.app.request("https://api.test/api/auth/login", {
      method: "POST",
      headers: { "content-type": "text/plain", origin: "https://evil.example" },
      body: JSON.stringify({ email: "anna@example.com", password: "correct horse" }),
    });
    expect(res.status).toBe(403);
  });

  it("must send JSON", async () => {
    const res = await t.app.request("https://api.test/api/auth/login", {
      method: "POST",
      headers: { "content-type": "text/plain", origin: "https://dominos.test" },
      body: JSON.stringify({ email: "anna@example.com", password: "correct horse" }),
    });
    expect(res.status).toBe(415);
  });
});

describe("the API", () => {
  it("reports its health", async () => {
    const res = await t.browser().get("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("answers unknown paths with a JSON 404", async () => {
    const res = await t.browser().get("/api/nope");
    expect(res.status).toBe(404);
    expect(await errorCode(res)).toBe("not_found");
  });
});
