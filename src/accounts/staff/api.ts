import type {
  CreateEvent,
  CreateIngredient,
  CreateIngredientGroup,
  Ingredient,
  IngredientGroup,
  InvitePerson,
  Person,
  StaffEvent,
  UpdateEvent,
  UpdateIngredient,
  UpdateIngredientGroup,
  UpdatePerson,
} from "@dominos/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../api";

const base = "/api/staff";

export const staffApi = {
  groups: () => request<IngredientGroup[]>("GET", `${base}/ingredient-groups`),
  createGroup: (body: CreateIngredientGroup) =>
    request<IngredientGroup>("POST", `${base}/ingredient-groups`, body),
  updateGroup: (id: string, body: UpdateIngredientGroup) =>
    request<IngredientGroup>("PATCH", `${base}/ingredient-groups/${id}`, body),
  deleteGroup: (id: string) => request<void>("DELETE", `${base}/ingredient-groups/${id}`),

  ingredients: (includeArchived = false) =>
    request<Ingredient[]>(
      "GET",
      `${base}/ingredients${includeArchived ? "?archived=include" : ""}`,
    ),
  createIngredient: (body: CreateIngredient) =>
    request<Ingredient>("POST", `${base}/ingredients`, body),
  updateIngredient: (id: string, body: UpdateIngredient) =>
    request<Ingredient>("PATCH", `${base}/ingredients/${id}`, body),

  people: () => request<Person[]>("GET", `${base}/people`),
  invitePerson: (body: InvitePerson) => request<Person>("POST", `${base}/people`, body),
  updatePerson: (id: string, body: UpdatePerson) =>
    request<Person>("PATCH", `${base}/people/${id}`, body),
  resendInvitation: (id: string) =>
    request<Person>("POST", `${base}/people/${id}/resend-invitation`),

  events: () => request<StaffEvent[]>("GET", `${base}/events`),
  event: (id: string) => request<StaffEvent>("GET", `${base}/events/${id}`),
  createEvent: (body: CreateEvent) => request<StaffEvent>("POST", `${base}/events`, body),
  updateEvent: (id: string, body: UpdateEvent) =>
    request<StaffEvent>("PATCH", `${base}/events/${id}`, body),
  setMenu: (id: string, ingredientIds: string[]) =>
    request<StaffEvent>("PUT", `${base}/events/${id}/menu`, { ingredientIds }),
  publishEvent: (id: string) => request<StaffEvent>("POST", `${base}/events/${id}/publish`),
  cancelEvent: (id: string) => request<StaffEvent>("POST", `${base}/events/${id}/cancel`),
  deleteEvent: (id: string) => request<void>("DELETE", `${base}/events/${id}`),
};

export const keys = {
  groups: ["staff", "ingredient-groups"] as const,
  ingredients: (includeArchived: boolean) => ["staff", "ingredients", { includeArchived }] as const,
  allIngredients: ["staff", "ingredients"] as const,
  people: ["staff", "people"] as const,
  events: ["staff", "events"] as const,
  event: (id: string) => ["staff", "events", id] as const,
};

export const useGroups = () => useQuery({ queryKey: keys.groups, queryFn: staffApi.groups });

export const useIngredients = (includeArchived = false) =>
  useQuery({
    queryKey: keys.ingredients(includeArchived),
    queryFn: () => staffApi.ingredients(includeArchived),
  });

export const usePeople = () => useQuery({ queryKey: keys.people, queryFn: staffApi.people });

export const useEvents = () => useQuery({ queryKey: keys.events, queryFn: staffApi.events });

/** One event; does nothing without an id, as on the new-event screen. */
export const useEvent = (id: string | undefined) =>
  useQuery({
    queryKey: keys.event(id ?? ""),
    queryFn: () => staffApi.event(id!),
    enabled: id !== undefined,
  });

/**
 * A mutation that refetches what it changed once it succeeds, e.g. the ingredient list after
 * archiving one. Every key starting with one of `invalidates` is refreshed.
 */
export function useStaffMutation<TVars, TResult>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  invalidates: readonly (readonly unknown[])[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all(invalidates.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}
