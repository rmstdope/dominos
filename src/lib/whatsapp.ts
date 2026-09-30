import type { Topping } from "../config/menu";
import { translations, type Language } from "../i18n/translations";

export type Order = {
  customerName: string;
  makeOwnPizza: boolean;
  toppings: Topping[];
  comment: string;
  language: Language;
};

/** The plain-text message the baker receives, in the language the customer is using. */
export function buildOrderMessage({
  customerName,
  makeOwnPizza,
  toppings,
  comment,
  language,
}: Order): string {
  const t = translations[language];
  const lines = [t.msgHeader(customerName.trim()), t.msgMakeOwn(makeOwnPizza), ""];
  if (toppings.length === 0) {
    lines.push(t.msgNoToppings);
  } else {
    lines.push(t.msgToppings(toppings.length));
    for (const topping of toppings) lines.push(`${topping.emoji} ${topping.name[language]}`);
  }
  if (comment.trim() !== "") lines.push("", t.msgComment, comment.trim());
  lines.push("", t.msgThanks);
  return lines.join("\n");
}

/**
 * A wa.me link opens the WhatsApp app on iOS and Android (and WhatsApp Web on desktop) with the
 * recipient and message pre-filled; the user just taps send.
 */
export function buildWhatsAppUrl(whatsappNumber: string, text: string): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
}
