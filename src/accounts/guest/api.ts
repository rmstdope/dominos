import type {
  ChangePassword,
  GuestEvent,
  GuestEventDetail,
  Me,
  CreateSavedPizza,
  PlaceOrder,
  SavedPizza,
  Toppings,
  UpdateMe,
  UpdateSavedPizza,
} from "@dominos/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../api";

export const guestKeys = {
  events: ["guest", "events"] as const,
  event: (id: string) => ["guest", "events", id] as const,
  pizzas: ["guest", "pizzas"] as const,
  toppings: ["guest", "toppings"] as const,
};

export const useGuestEvents = () =>
  useQuery({
    queryKey: guestKeys.events,
    queryFn: () => request<GuestEvent[]>("GET", "/api/events"),
  });

export const useGuestEvent = (id: string) =>
  useQuery({
    queryKey: guestKeys.event(id),
    queryFn: () => request<GuestEventDetail>("GET", `/api/events/${id}`),
  });

/**
 * Placing, withdrawing and declining all answer with the updated event, which replaces the cached
 * one; the list is refetched for its summaries.
 */
function useEventChange<TVars>(id: string, send: (vars: TVars) => Promise<GuestEventDetail>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: (detail) => {
      queryClient.setQueryData(guestKeys.event(id), detail);
      return queryClient.invalidateQueries({ queryKey: guestKeys.events, exact: true });
    },
  });
}

export const usePlaceOrder = (id: string) =>
  useEventChange(id, (body: PlaceOrder) =>
    request<GuestEventDetail>("PUT", `/api/events/${id}/order`, body),
  );

export const useWithdrawOrder = (id: string) =>
  useEventChange(id, () => request<GuestEventDetail>("DELETE", `/api/events/${id}/order`));

export const useDecline = (id: string) =>
  useEventChange(id, () => request<GuestEventDetail>("POST", `/api/events/${id}/decline`));

export const usePizzas = () =>
  useQuery({
    queryKey: guestKeys.pizzas,
    queryFn: () => request<SavedPizza[]>("GET", "/api/me/pizzas"),
  });

export const useToppings = () =>
  useQuery({
    queryKey: guestKeys.toppings,
    queryFn: () => request<Toppings>("GET", "/api/me/pizzas/toppings"),
  });

function usePizzaChange<TVars, TResult>(send: (vars: TVars) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: guestKeys.pizzas }),
  });
}

export const useCreatePizza = () =>
  usePizzaChange((body: CreateSavedPizza) => request<SavedPizza>("POST", "/api/me/pizzas", body));

export const useUpdatePizza = () =>
  usePizzaChange(({ id, ...body }: UpdateSavedPizza & { id: string }) =>
    request<SavedPizza>("PATCH", `/api/me/pizzas/${id}`, body),
  );

export const useDeletePizza = () =>
  usePizzaChange((id: string) => request<void>("DELETE", `/api/me/pizzas/${id}`));

export const updateMe = (body: UpdateMe) => request<Me>("PATCH", "/api/me", body);

export const changePassword = (body: ChangePassword) =>
  request<void>("POST", "/api/me/password", body);
