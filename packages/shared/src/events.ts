import { z } from "zod";
import { emailSchema, LANGUAGES, nameSchema } from "./auth.ts";
import type { EventPhase, IngredientGroup, Localized, PersonStatus } from "./staff.ts";

export const INVITATION_STATUSES = ["invited", "declined"] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

// --- What a guest sees ---------------------------------------------------------------------------

/** A guest's own order. One pizza per person per event. */
export type Order = {
  number: number;
  toppingIds: string[];
  makeOwn: boolean;
  /** A smaller pizza with a thicker crust. */
  smallerThicker: boolean;
  comment: string | null;
  /** Placed after orders closed. */
  late: boolean;
};

/** An event in a guest's list. Times are ISO 8601 strings. */
export type GuestEvent = {
  id: string;
  name: Localized;
  startsAt: string;
  location: Localized;
  ordersCloseAt: string;
  phase: EventPhase;
  invitation: InvitationStatus;
  order: Order | null;
  /** The names of the toppings on the order, for the list; the menu is on the event itself. */
  orderToppings: Localized[];
};

/** A topping a guest can pick. */
export type MenuItem = {
  id: string;
  groupId: string;
  name: Localized;
  emoji: string | null;
};

/** One event with everything the pizza builder needs. */
export type GuestEventDetail = GuestEvent & {
  maxToppings: number | null;
  note: Localized | null;
  askMakeOwn: boolean;
  askSmallerThicker: boolean;
  groups: IngredientGroup[];
  menu: MenuItem[];
};

export const placeOrderSchema = z.object({
  toppingIds: z.array(z.uuid()).max(30),
  makeOwn: z.boolean(),
  // Optional, so an order from a page loaded before guests could ask still goes through.
  smallerThicker: z.boolean().default(false),
  comment: z.string().trim().max(500).nullable(),
});
export type PlaceOrder = z.infer<typeof placeOrderSchema>;

// --- What staff see ------------------------------------------------------------------------------

/** Someone invited to an event, for the staff's invitations list. */
export type EventGuest = {
  userId: string;
  name: string;
  email: string;
  /** Whether their account is set up; an invitation to someone new also creates their account. */
  personStatus: PersonStatus;
  invitation: InvitationStatus;
  invitedAt: string;
  seen: boolean;
  ordered: boolean;
};

export const inviteToEventSchema = z
  .object({
    /** People who already have an account (or a pending one). */
    userIds: z.array(z.uuid()).max(200).default([]),
    /** People new to Dominos: they get one email that sets up the account and shows the event. */
    newPeople: z
      .array(z.object({ name: nameSchema, email: emailSchema, language: z.enum(LANGUAGES) }))
      .max(50)
      .default([]),
    message: z.string().trim().max(500).optional(),
  })
  .refine((body) => body.userIds.length + body.newPeople.length > 0, {
    message: "Invite at least one person",
  });
export type InviteToEvent = z.input<typeof inviteToEventSchema>;

// --- Saved pizzas --------------------------------------------------------------------------------

/** A pizza someone named and saved; an order can start from it and change it before sending. */
export type SavedPizza = {
  id: string;
  name: string;
  /** New orders start from it. At most one per person. */
  favourite: boolean;
  ingredients: { id: string; name: Localized }[];
};

/** Everything in the pantry, for putting a saved pizza together outside any event. */
export type Toppings = { groups: IngredientGroup[]; items: MenuItem[] };

const pizzaName = z.string().trim().min(1).max(40);
const pizzaToppings = z.array(z.uuid()).max(30);

export const createSavedPizzaSchema = z.object({
  name: pizzaName,
  ingredientIds: pizzaToppings,
  favourite: z.boolean().default(false),
});
export type CreateSavedPizza = z.input<typeof createSavedPizzaSchema>;

export const updateSavedPizzaSchema = z.object({
  name: pizzaName.optional(),
  ingredientIds: pizzaToppings.optional(),
  /** Making one the favourite takes that away from any other. */
  favourite: z.boolean().optional(),
});
export type UpdateSavedPizza = z.infer<typeof updateSavedPizzaSchema>;

// --- The night itself (staff) --------------------------------------------------------------------

export type StaffOrder = {
  id: string;
  number: number;
  name: string;
  email: string;
  toppings: Localized[];
  makeOwn: boolean;
  smallerThicker: boolean;
  comment: string | null;
  /** Placed after orders closed. */
  late: boolean;
  baked: boolean;
};

/** Everything the kitchen needs: each order, and how many pizzas need each topping. */
export type EventOrders = {
  pizzas: number;
  makeOwn: number;
  smallerThicker: number;
  prep: { ingredientId: string; name: Localized; count: number }[];
  orders: StaffOrder[];
};

export const markBakedSchema = z.object({ baked: z.boolean() });

/** How many reminder emails went out. */
export type RemindResult = { sent: number };
