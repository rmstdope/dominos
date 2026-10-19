import { z } from "zod";

const boolean = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1");

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  /** Where the frontend is served. Links in emails point here. */
  APP_ORIGIN: z.url().default("http://localhost:5173"),
  /** Postgres in production. Without it the API keeps an embedded PGlite database on disk. */
  DATABASE_URL: z.string().min(1).optional(),
  PGLITE_DIR: z.string().min(1).default(".data/pglite"),
  /** e.g. smtps://user:password@smtp.example.com:465. Without it emails are printed to the log. */
  SMTP_URL: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(1).default("Dominos <dominos@rmstdope.eu>"),
  /** Session cookies are Secure unless this is false, which only plain-http local dev needs. */
  COOKIE_SECURE: boolean.optional(),
  /** Behind Caddy: take the client address from the last X-Forwarded-For hop. */
  TRUST_PROXY: boolean.default(false),
});

export type Config = {
  port: number;
  appOrigin: string;
  databaseUrl: string | undefined;
  pgliteDir: string;
  smtpUrl: string | undefined;
  mailFrom: string;
  cookieSecure: boolean;
  trustProxy: boolean;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // An empty variable counts as unset: compose passes `SMTP_URL=` when .env leaves it blank.
  const set = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ""));
  const parsed = envSchema.safeParse(set);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment:\n${problems.join("\n")}`);
  }
  const e = parsed.data;
  const appOrigin = new URL(e.APP_ORIGIN).origin;
  return {
    port: e.PORT,
    appOrigin,
    databaseUrl: e.DATABASE_URL,
    pgliteDir: e.PGLITE_DIR,
    smtpUrl: e.SMTP_URL,
    mailFrom: e.MAIL_FROM,
    cookieSecure: e.COOKIE_SECURE ?? appOrigin.startsWith("https:"),
    trustProxy: e.TRUST_PROXY,
  };
}
