import { z } from "zod";
import { emailSchema, LANGUAGES, nameSchema, ROLES, type Language, type Role } from "./auth.ts";

const text = (max: number) => z.string().trim().min(1).max(max);

/** A text given in every language, the same shape config/menu.json uses: { en: "Ham", sv: "Skinka" }. */
export type Localized = { en: string; sv: string };
const localized = (max: number) => z.object({ en: text(max), sv: text(max) });

// --- Ingredients ---------------------------------------------------------------------------------

export type IngredientGroup = { id: string; name: Localized; sort: number };

export type Ingredient = {
  id: string;
  groupId: string;
  name: Localized;
  /** Shown beside the name, like 🍄. */
  emoji: string | null;
  inStock: boolean;
  sort: number;
  archived: boolean;
};

export const createIngredientGroupSchema = z.object({ name: localized(40) });
export type CreateIngredientGroup = z.infer<typeof createIngredientGroupSchema>;

export const updateIngredientGroupSchema = z.object({
  name: localized(40).optional(),
  sort: z.int().min(0).max(10_000).optional(),
});
export type UpdateIngredientGroup = z.infer<typeof updateIngredientGroupSchema>;

/** One emoji, or null for none; a little room for the longer joined ones like 🧑‍🍳. */
const emoji = z.string().trim().min(1).max(16).nullable();

export const createIngredientSchema = z.object({
  groupId: z.uuid(),
  name: localized(40),
  emoji: emoji.optional(),
  inStock: z.boolean().optional(),
});
export type CreateIngredient = z.infer<typeof createIngredientSchema>;

export const updateIngredientSchema = z.object({
  groupId: z.uuid().optional(),
  name: localized(40).optional(),
  emoji: emoji.optional(),
  inStock: z.boolean().optional(),
  sort: z.int().min(0).max(10_000).optional(),
  /** Archived ingredients leave the pantry but stay on old orders. */
  archived: z.boolean().optional(),
});
export type UpdateIngredient = z.infer<typeof updateIngredientSchema>;

// --- People --------------------------------------------------------------------------------------

/**
 * - active: has accepted the invitation and can sign in
 * - invited: waiting for them to accept
 * - invitation_expired: never accepted, and the link has run out; resend it
 * - disabled: cannot sign in until staff enable them again
 */
export type PersonStatus = "active" | "invited" | "invitation_expired" | "disabled";

export type Person = {
  id: string;
  email: string;
  name: string;
  role: Role;
  language: Language;
  status: PersonStatus;
};

export const invitePersonSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  role: z.enum(ROLES),
  language: z.enum(LANGUAGES),
});
export type InvitePerson = z.infer<typeof invitePersonSchema>;

export const updatePersonSchema = z.object({
  email: emailSchema.optional(),
  name: nameSchema.optional(),
  role: z.enum(ROLES).optional(),
  disabled: z.boolean().optional(),
});
export type UpdatePerson = z.infer<typeof updatePersonSchema>;

// --- Events --------------------------------------------------------------------------------------

export const EVENT_STATUSES = ["draft", "published", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/** What an event is doing right now, from its status and its times. */
export type EventPhase = "draft" | "cancelled" | "open" | "closed" | "past";

export function eventPhase(
  event: { status: EventStatus; ordersCloseAt: string | Date; startsAt: string | Date },
  now: Date,
): EventPhase {
  if (event.status === "draft") return "draft";
  if (event.status === "cancelled") return "cancelled";
  const time = now.getTime();
  if (time >= new Date(event.startsAt).getTime()) return "past";
  if (time >= new Date(event.ordersCloseAt).getTime()) return "closed";
  return "open";
}

/** An event as staff see it. Times are ISO 8601 strings. */
export type StaffEvent = {
  id: string;
  name: string;
  startsAt: string;
  location: string;
  ordersCloseAt: string;
  maxToppings: number | null;
  note: Localized | null;
  askMakeOwn: boolean;
  status: EventStatus;
  phase: EventPhase;
  ingredientIds: string[];
  /** How the invitations are going. */
  guests: { invited: number; declined: number; ordered: number };
};

const dateTime = z.iso.datetime({ offset: true });

const eventFields = {
  name: text(80),
  startsAt: dateTime,
  location: text(120),
  ordersCloseAt: dateTime,
  maxToppings: z.int().min(1).max(30).nullable(),
  note: localized(500).nullable(),
  askMakeOwn: z.boolean(),
};

export const ordersCloseBeforeStart = (e: { startsAt: string; ordersCloseAt: string }) =>
  new Date(e.ordersCloseAt).getTime() <= new Date(e.startsAt).getTime();

const closeBeforeStart = {
  message: "Orders must close before the event starts",
  path: ["ordersCloseAt"],
};

export const createEventSchema = z
  .object({ ...eventFields, ingredientIds: z.array(z.uuid()).max(200).optional() })
  .refine(ordersCloseBeforeStart, closeBeforeStart);
export type CreateEvent = z.infer<typeof createEventSchema>;

/** Any subset of the fields; the API checks the times again against what is already saved. */
export const updateEventSchema = z.object(eventFields).partial();
export type UpdateEvent = z.infer<typeof updateEventSchema>;

export const setMenuSchema = z.object({ ingredientIds: z.array(z.uuid()).max(200) });
export type SetMenu = z.infer<typeof setMenuSchema>;
