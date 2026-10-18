import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const role = pgEnum("role", ["customer", "staff"]);
export const language = pgEnum("language", ["en", "sv"]);
export const authTokenKind = pgEnum("auth_token_kind", ["invite", "reset"]);
export const eventStatus = pgEnum("event_status", ["draft", "published", "cancelled"]);

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

/** Headings the toppings are listed under, e.g. Meat, Veg, Extras. */
export const ingredientGroups = pgTable("ingredient_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  nameEn: text("name_en").notNull(),
  nameSv: text("name_sv").notNull(),
  sort: integer("sort").notNull().default(0),
  createdAt: createdAt(),
});

/**
 * The pantry every event's menu is picked from. Ingredients are archived rather than deleted, so
 * an old order still knows what was on it.
 */
export const ingredients = pgTable(
  "ingredients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => ingredientGroups.id, { onDelete: "restrict" }),
    nameEn: text("name_en").notNull(),
    nameSv: text("name_sv").notNull(),
    inStock: boolean("in_stock").notNull().default(true),
    sort: integer("sort").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("ingredients_group_id_idx").on(t.groupId)],
);

/**
 * A pizza night. Whether orders are open, closed or the night is past follows from the times; only
 * the staff's own decisions (draft, published, cancelled) are stored.
 */
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  location: text("location").notNull(),
  ordersCloseAt: timestamp("orders_close_at", { withTimezone: true }).notNull(),
  /** Null means no limit. */
  maxToppings: integer("max_toppings"),
  noteEn: text("note_en"),
  noteSv: text("note_sv"),
  askMakeOwn: boolean("ask_make_own").notNull().default(true),
  status: eventStatus("status").notNull().default("draft"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** An event's menu: the ingredients guests can pick from. */
export const eventIngredients = pgTable(
  "event_ingredients",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.ingredientId] })],
);

export type User = typeof users.$inferSelect;
export type IngredientGroupRow = typeof ingredientGroups.$inferSelect;
export type IngredientRow = typeof ingredients.$inferSelect;
export type EventRow = typeof events.$inferSelect;
