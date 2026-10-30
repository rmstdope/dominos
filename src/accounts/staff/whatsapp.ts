import type { StaffEvent } from "@dominos/shared";
import type { Language } from "../../i18n/translations";
import { formatWhen } from "../dates";
import type { StaffText } from "./text";

/** The message staff paste into a group chat: what, when, where, and the link to order. */
export function shareMessage(
  event: StaffEvent,
  origin: string,
  language: Language,
  t: StaffText,
): string {
  return t.whatsAppMessage({
    name: event.name[language],
    when: formatWhen(event.startsAt, language),
    location: event.location[language],
    ordersClose: formatWhen(event.ordersCloseAt, language),
    link: `${origin}/events/${event.id}`,
  });
}

/**
 * A wa.me link with no number opens WhatsApp (the app on a phone, WhatsApp Web on a computer) with
 * the message filled in and lets you pick the chat to send it to.
 */
export const whatsAppShareUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
