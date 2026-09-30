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

const order = { makeOwnPizza: false, comment: "" };

describe("buildOrderMessage", () => {
  it("lists the customer name and each topping on its own line", () => {
    expect(
      buildOrderMessage({
        ...order,
        customerName: "Henrik",
        toppings: [cheese, ham],
        language: "en",
      }),
    ).toBe(
      [
        "🍕 Pizza order from Henrik",
        "🧑‍🍳 Make my own pizza: No",
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
      buildOrderMessage({
        ...order,
        customerName: "Henrik",
        toppings: [cheese, ham],
        language: "sv",
      }),
    ).toBe(
      [
        "🍕 Pizzabeställning från Henrik",
        "🧑‍🍳 Göra egen pizza: Nej",
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
      buildOrderMessage({ ...order, customerName: "  Anna ", toppings: [cheese], language: "en" }),
    ).toContain("order from Anna\n");
  });

  it("describes a pizza without toppings", () => {
    expect(
      buildOrderMessage({ ...order, customerName: "Bo", toppings: [], language: "en" }),
    ).toContain("Plain pizza, no toppings.");
    expect(
      buildOrderMessage({ ...order, customerName: "Bo", toppings: [], language: "sv" }),
    ).toContain("Vanlig pizza, inga toppings.");
  });

  it("says whether the customer makes their own pizza", () => {
    const base = { ...order, customerName: "Bo", toppings: [cheese] };
    expect(buildOrderMessage({ ...base, makeOwnPizza: true, language: "en" })).toContain(
      "\n🧑‍🍳 Make my own pizza: Yes\n",
    );
    expect(buildOrderMessage({ ...base, makeOwnPizza: true, language: "sv" })).toContain(
      "\n🧑‍🍳 Göra egen pizza: Ja\n",
    );
  });

  it("adds a trimmed comment after the toppings, and nothing for a blank one", () => {
    const base = { ...order, customerName: "Bo", toppings: [cheese] };
    expect(
      buildOrderMessage({ ...base, comment: "  Extra crispy,\nplease! ", language: "en" }),
    ).toBe(
      [
        "🍕 Pizza order from Bo",
        "🧑‍🍳 Make my own pizza: No",
        "",
        "Toppings (1):",
        "🧀 Mozzarella",
        "",
        "💬 Comment:",
        "Extra crispy,\nplease!",
        "",
        "Thanks!",
      ].join("\n"),
    );
    expect(buildOrderMessage({ ...base, comment: "Utan lök", language: "sv" })).toContain(
      "💬 Kommentar:\nUtan lök\n",
    );
    expect(buildOrderMessage({ ...base, comment: "   ", language: "en" })).not.toContain("Comment");
  });
});

describe("buildWhatsAppUrl", () => {
  it("targets wa.me with the number and url-encoded text", () => {
    const url = buildWhatsAppUrl("46701234567", "Hi there\nline 2 & more");
    expect(url).toBe("https://wa.me/46701234567?text=Hi%20there%0Aline%202%20%26%20more");
  });

  it("round-trips the message through the URL", () => {
    const text = buildOrderMessage({
      ...order,
      customerName: "Åsa Ö",
      toppings: [cheese],
      language: "sv",
    });
    const url = new URL(buildWhatsAppUrl("46701234567", text));
    expect(url.searchParams.get("text")).toBe(text);
  });
});
