import type { ApiError, Person } from "@dominos/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Harness, tokenFromEmail, type Browser } from "../../test/harness.ts";

const DAY = 24 * 60 * 60 * 1000;
const t = new Harness();
let staff: Browser;
let staffId: string;

beforeAll(() => t.start());
afterAll(() => t.database.close());
beforeEach(async () => {
  await t.reset();
  const signedIn = await t.signedIn("staff", "baker@example.com");
  staff = signedIn.browser;
  staffId = signedIn.user.id;
});

const invite = (email: string, role: "customer" | "staff" = "customer", language = "en") =>
  staff.json<Person>("POST", "/api/staff/people", { email, name: "Anna", role, language }, 201);

const people = () => staff.json<Person[]>("GET", "/api/staff/people");

async function accept(email = t.sent.at(-1)) {
  const res = await t.browser().post(`/api/auth/invitations/${tokenFromEmail(email)}`, {
    name: "Anna",
    password: "pizzapizza",
  });
  expect(res.status).toBe(200);
}

describe("inviting people", () => {
  it("creates the account and emails a link to set a password", async () => {
    const person = await invite("Anna@Example.com");
    expect(person).toMatchObject({
      email: "anna@example.com",
      role: "customer",
      status: "invited",
    });
    expect(t.sent).toHaveLength(1);
    expect(t.sent[0]?.to).toBe("anna@example.com");
    expect(t.sent[0]?.text).toContain("https://dominos.test/invitation#");

    await accept();
    const anna = (await people()).find((p) => p.email === "anna@example.com");
    expect(anna?.status).toBe("active");
  });

  it("writes the invitation in their language", async () => {
    await invite("sven@example.com", "customer", "sv");
    expect(t.sent[0]?.subject).toBe("Du är inbjuden till Dominos");
  });

  it("refuses someone who already has an account", async () => {
    await invite("anna@example.com");
    await accept();
    const res = await staff.post("/api/staff/people", {
      email: "anna@example.com",
      name: "Anna",
      role: "customer",
      language: "en",
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as ApiError).error.code).toBe("conflict");
  });

  it("shows an invitation that ran out, and can resend it", async () => {
    const anna = await invite("anna@example.com");
    t.advance(7 * DAY + 1);
    expect((await people()).find((p) => p.id === anna.id)?.status).toBe("invitation_expired");

    const resent = await staff.json<Person>(
      "POST",
      `/api/staff/people/${anna.id}/resend-invitation`,
    );
    expect(resent.status).toBe("invited");
    expect(t.sent).toHaveLength(2);
    await accept(t.sent[1]);
  });

  it("does not resend to someone who already accepted", async () => {
    const anna = await invite("anna@example.com");
    await accept();
    expect((await staff.post(`/api/staff/people/${anna.id}/resend-invitation`)).status).toBe(409);
  });

  it("reports a failed email after saving the person", async () => {
    t.app = (await import("../../app.ts")).createApp({
      db: t.db,
      mailer: { send: () => Promise.reject(new Error("SMTP down")) },
      config: (await import("../../test/harness.ts")).testConfig,
      now: () => t.now,
      defer: () => {},
    });
    const res = await staff.post("/api/staff/people", {
      email: "anna@example.com",
      name: "Anna",
      role: "customer",
      language: "en",
    });
    expect(res.status).toBe(502);
    expect((await people()).some((p) => p.email === "anna@example.com")).toBe(true);
  });
});

describe("changing people", () => {
  it("can make someone staff, and back", async () => {
    const anna = await invite("anna@example.com");
    await accept();
    const promoted = await staff.json<Person>("PATCH", `/api/staff/people/${anna.id}`, {
      role: "staff",
    });
    expect(promoted.role).toBe("staff");
    const demoted = await staff.json<Person>("PATCH", `/api/staff/people/${anna.id}`, {
      role: "customer",
    });
    expect(demoted.role).toBe("customer");
  });

  it("keeps at least one staff member", async () => {
    const res = await staff.patch(`/api/staff/people/${staffId}`, { role: "customer" });
    expect(res.status).toBe(409);
    expect((await staff.patch(`/api/staff/people/${staffId}`, { disabled: true })).status).toBe(
      409,
    );
  });

  it("does not count someone still to accept as staff", async () => {
    await invite("anna@example.com", "staff");
    expect((await staff.patch(`/api/staff/people/${staffId}`, { role: "customer" })).status).toBe(
      409,
    );
  });

  it("lets a staff member step down once there is another", async () => {
    const anna = await invite("anna@example.com", "staff");
    await accept();
    expect(anna.role).toBe("staff");
    const me = await staff.json<Person>("PATCH", `/api/staff/people/${staffId}`, {
      role: "customer",
    });
    expect(me.role).toBe("customer");
    // No longer staff, so the staff routes are closed to this browser now.
    expect((await staff.get("/api/staff/people")).status).toBe(403);
  });

  it("disables someone, which signs them out, and enables them again", async () => {
    const { user, browser } = await t.signedIn("customer");
    const disabled = await staff.json<Person>("PATCH", `/api/staff/people/${user.id}`, {
      disabled: true,
    });
    expect(disabled.status).toBe("disabled");
    expect((await browser.get("/api/me")).status).toBe(401);

    const enabled = await staff.json<Person>("PATCH", `/api/staff/people/${user.id}`, {
      disabled: false,
    });
    expect(enabled.status).toBe("active");
  });

  it("changes someone's email, but not to one that is taken", async () => {
    const { user } = await t.signedIn("customer", "old@example.com");
    await t.signedIn("customer", "taken@example.com");
    const changed = await staff.json<Person>("PATCH", `/api/staff/people/${user.id}`, {
      email: "New@Example.com",
    });
    expect(changed.email).toBe("new@example.com");
    const res = await staff.patch(`/api/staff/people/${user.id}`, { email: "taken@example.com" });
    expect(res.status).toBe(409);
  });

  it("answers 404 for someone who does not exist", async () => {
    const res = await staff.patch("/api/staff/people/8f14e45f-ceea-467a-9575-1f2a3b4c5d6e", {
      name: "Nobody",
    });
    expect(res.status).toBe(404);
  });
});
