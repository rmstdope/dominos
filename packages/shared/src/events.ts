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
  comment: string | null;
};

/** An event in a guest's list. Times are ISO 8601 strings. */
export type GuestEvent = {
  id: string;
  name: string;
  startsAt: string;
  location: string;
  ordersCloseAt: string;
  phase: EventPhase;
  invitation: InvitationStatus;
  order: Order | null;
  /** The names of the toppings on the order, for the list; the menu is on the event itself. */
  orderToppings: Localized[];
};

/** A topping a guest can pick. Out-of-stock ones are shown but cannot be picked. */
export type MenuItem = {
  id: string;
  groupId: string;
  name: Localized;
  emoji: string | null;
  inStock: boolean;
};

/** One event with everything the pizza builder needs. */
export type GuestEventDetail = GuestEvent & {
  maxToppings: number | null;
  note: Localized | null;
  askMakeOwn: boolean;
  groups: IngredientGroup[];
  menu: MenuItem[];
};

export const placeOrderSchema = z.object({
  toppingIds: z.array(z.uuid()).max(30),
  makeOwn: z.boolean(),
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

// --- Favourites ----------------------------------------------------------------------------------

/** A person's favourite pizza, which the builder starts from. */
export type Favourite = { ingredients: { id: string; name: Localized }[] };

export const setFavouriteSchema = z.object({ ingredientIds: z.array(z.uuid()).max(30) });
export type SetFavourite = z.infer<typeof setFavouriteSchema>;

// --- The night itself (staff) --------------------------------------------------------------------

export type StaffOrder = {
  id: string;
  number: number;
  name: string;
  email: string;
  toppings: Localized[];
  makeOwn: boolean;
  comment: string | null;
  baked: boolean;
};

/** Everything the kitchen needs: each order, and how many pizzas need each topping. */
export type EventOrders = {
  pizzas: number;
  makeOwn: number;
  prep: { ingredientId: string; name: Localized; count: number }[];
  orders: StaffOrder[];
};

export const markBakedSchema = z.object({ baked: z.boolean() });

/** How many reminder emails went out. */
export type RemindResult = { sent: number };
