import type { GuestEvent, GuestEventDetail, PlaceOrder } from "@dominos/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../api";

export const guestKeys = {
  events: ["guest", "events"] as const,
  event: (id: string) => ["guest", "events", id] as const,
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
