import { sql } from "drizzle-orm";
import { createApp, type App } from "../app.ts";
import type { Config } from "../config.ts";
import { connectPglite, type Database } from "../db/client.ts";
import type { Email, Mailer } from "../mail/mailer.ts";

export const APP_ORIGIN = "https://dominos.test";

export const testConfig: Config = {
  port: 0,
  appOrigin: APP_ORIGIN,
  databaseUrl: undefined,
  pgliteDir: "",
  smtpUrl: undefined,
  mailFrom: "Dominos <dominos@test>",
  cookieSecure: true,
  trustProxy: false,
};

/**
 * One in-memory database per test file, emptied before each test, and a fresh app per test so
 * rate limits start from zero. The clock stands still until a test moves it.
 */
export class Harness {
  database!: Database;
  app!: App;
  sent: Email[] = [];
  now = new Date("2026-11-02T12:00:00Z");
  private pending: Promise<void>[] = [];

  async start() {
    this.database = await connectPglite();
  }

  async reset() {
    await this.database.db.execute(sql`truncate users, auth_tokens, sessions cascade`);
    this.sent = [];
    this.now = new Date("2026-11-02T12:00:00Z");
    const mailer: Mailer = {
      send: async (email) => {
        this.sent.push(email);
      },
    };
    this.app = createApp({
      db: this.database.db,
      mailer,
      config: testConfig,
      now: () => this.now,
      defer: (task) => {
        this.pending.push(task());
      },
    });
  }

  get db() {
    return this.database.db;
  }

  advance(ms: number) {
    this.now = new Date(this.now.getTime() + ms);
  }

  /** Waits for deferred work, such as emails, that the last requests started. */
  async settle() {
    const pending = this.pending;
    this.pending = [];
    await Promise.all(pending);
  }

  /** A browser: keeps the cookies the API sets and sends them back. */
  browser() {
    return new Browser(this);
  }
}

export class Browser {
  private readonly harness: Harness;
  cookies = new Map<string, string>();

  constructor(harness: Harness) {
    this.harness = harness;
  }

  async request(
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const init: RequestInit = {
      method,
      headers: {
        origin: APP_ORIGIN,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(this.cookies.size
          ? { cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ") }
          : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    };
    const res = await this.harness.app.request(`https://api.test${path}`, init);
    for (const cookie of res.headers.getSetCookie()) {
      const [pair = "", ...attributes] = cookie.split(";");
      const [name = "", value = ""] = pair.split("=");
      const expired = attributes.some((a) => /max-age=0/i.test(a)) || value === "";
      if (expired) this.cookies.delete(name.trim());
      else this.cookies.set(name.trim(), value);
    }
    return res;
  }

  get(path: string) {
    return this.request("GET", path);
  }

  post(path: string, body?: unknown) {
    return this.request("POST", path, body);
  }
}

/** The token at the end of a link in an email, e.g. https://…/invitation#<token>. */
export function tokenFromEmail(email: Email | undefined): string {
  const match = email?.text.match(/#([A-Za-z0-9_-]+)/);
  if (!match?.[1]) throw new Error(`No link in email: ${email?.text}`);
  return match[1];
}
