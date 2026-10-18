import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const role = pgEnum("role", ["customer", "staff"]);
export const language = pgEnum("language", ["en", "sv"]);
export const authTokenKind = pgEnum("auth_token_kind", ["invite", "reset"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/**
 * Everyone who can sign in. Staff create the row when they invite someone; it has no password
 * until the invitation is accepted, and nobody can sign in without one.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Always stored trimmed and lower-cased. */
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: role("role").notNull().default("customer"),
  language: language("language").notNull().default("en"),
  passwordHash: text("password_hash"),
  createdAt: createdAt(),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
});

/** Single-use links sent by email: account invitations and password resets. Only a hash is kept. */
export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: authTokenKind("kind").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("auth_tokens_user_id_idx").on(t.userId)],
);

/** A signed-in browser. The cookie holds a random token; the table holds its hash. */
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;
