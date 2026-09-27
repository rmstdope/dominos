import { describe, expect, it } from "vitest";
import { buildOrderMessage, buildWhatsAppUrl } from "./whatsapp";

const cheese = {
  id: "cheese",
  name: { en: "Mozzarella", sv: "Mozzarella" },
  emoji: "🧀",
  group: { en: "Cheese", sv: "Ost" },
};
const ham = {
  id: "ham",
  name: { en: "Ham", sv: "Skinka" },
  emoji: "🍖",
  group: { en: "Meat", sv: "Kött" },
};

describe("buildOrderMessage", () => {
  it("lists the customer name and each topping on its own line", () => {
    expect(
      buildOrderMessage({ customerName: "Henrik", toppings: [cheese, ham], language: "en" }),
    ).toBe(
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

  it("writes the message in Swedish with Swedish topping names", () => {
    expect(
      buildOrderMessage({ customerName: "Henrik", toppings: [cheese, ham], language: "sv" }),
    ).toBe(
      [
        "🍕 Pizzabeställning från Henrik",
        "",
        "Toppings (2):",
        "🧀 Mozzarella",
        "🍖 Skinka",
        "",
        "Tack!",
      ].join("\n"),
    );
  });

  it("trims the customer name", () => {
    expect(
      buildOrderMessage({ customerName: "  Anna ", toppings: [cheese], language: "en" }),
    ).toContain("order from Anna\n");
  });

  it("describes a pizza without toppings", () => {
    expect(buildOrderMessage({ customerName: "Bo", toppings: [], language: "en" })).toContain(
      "Plain pizza, no toppings.",
    );
    expect(buildOrderMessage({ customerName: "Bo", toppings: [], language: "sv" })).toContain(
      "Vanlig pizza, inga toppings.",
    );
  });
});

describe("buildWhatsAppUrl", () => {
  it("targets wa.me with the number and url-encoded text", () => {
    const url = buildWhatsAppUrl("46701234567", "Hi there\nline 2 & more");
    expect(url).toBe("https://wa.me/46701234567?text=Hi%20there%0Aline%202%20%26%20more");
  });

  it("round-trips the message through the URL", () => {
    const text = buildOrderMessage({ customerName: "Åsa Ö", toppings: [cheese], language: "sv" });
    const url = new URL(buildWhatsAppUrl("46701234567", text));
    expect(url.searchParams.get("text")).toBe(text);
  });
});
