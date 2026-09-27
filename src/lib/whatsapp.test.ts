import { describe, expect, it } from "vitest";
import { buildOrderMessage, buildWhatsAppUrl } from "./whatsapp";

const cheese = { id: "cheese", name: "Mozzarella", emoji: "🧀", group: "Cheese" };
const ham = { id: "ham", name: "Ham", emoji: "🍖", group: "Meat" };

describe("buildOrderMessage", () => {
  it("lists the customer name and each topping on its own line", () => {
    expect(buildOrderMessage({ customerName: "Henrik", toppings: [cheese, ham] })).toBe(
      [
        "🍕 Pizza order from Henrik",
        "",
        "Toppings (2):",
        "🧀 Mozzarella",
        "🍖 Ham",
        "",
        "Thanks!",
      ].join("\n"),
    );
  });

  it("trims the customer name", () => {
    expect(buildOrderMessage({ customerName: "  Anna ", toppings: [cheese] })).toContain(
      "order from Anna\n",
    );
  });

  it("describes a pizza without toppings", () => {
    expect(buildOrderMessage({ customerName: "Bo", toppings: [] })).toContain(
      "Plain pizza, no toppings.",
    );
  });
});

describe("buildWhatsAppUrl", () => {
  it("targets wa.me with the number and url-encoded text", () => {
    const url = buildWhatsAppUrl("46701234567", "Hi there\nline 2 & more");
    expect(url).toBe("https://wa.me/46701234567?text=Hi%20there%0Aline%202%20%26%20more");
  });

  it("round-trips the message through the URL", () => {
    const text = buildOrderMessage({ customerName: "Åsa Ö", toppings: [cheese] });
    const url = new URL(buildWhatsAppUrl("46701234567", text));
    expect(url.searchParams.get("text")).toBe(text);
  });
});
