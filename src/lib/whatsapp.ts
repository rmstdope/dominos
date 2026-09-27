import type { Topping } from "../config/menu";

export type Order = {
  customerName: string;
  toppings: Topping[];
};

/** The plain-text message the baker receives. */
export function buildOrderMessage({ customerName, toppings }: Order): string {
  const lines = [`🍕 Pizza order from ${customerName.trim()}`, ""];
  if (toppings.length === 0) {
    lines.push("Plain pizza, no toppings.");
  } else {
    lines.push(`Toppings (${toppings.length}):`);
    for (const topping of toppings) lines.push(`${topping.emoji} ${topping.name}`);
  }
  lines.push("", "Thanks!");
  return lines.join("\n");
}

/**
 * A wa.me link opens the WhatsApp app on iOS and Android (and WhatsApp Web on desktop) with the
 * recipient and message pre-filled; the user just taps send.
 */
export function buildWhatsAppUrl(whatsappNumber: string, text: string): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
}
