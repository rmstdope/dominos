import { expect, test } from "@playwright/test";
import menu from "../config/menu.json" with { type: "json" };

test.describe("ordering a pizza", () => {
  test.use({ locale: "en-GB" });

  test("walks from name to toppings to a WhatsApp link, on a static server", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/who's hungry/i);

    const continueButton = page.getByRole("button", { name: /pick toppings/i });
    await expect(continueButton).toBeDisabled();
    await page.getByLabel(/your name/i).fill("Henrik");
    await continueButton.click();

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/build your pizza, henrik/i);
    const first = menu.toppings[0]!;
    const second = menu.toppings[1]!;
    await page.getByRole("checkbox", { name: first.name.en }).click();
    await page.getByRole("checkbox", { name: second.name.en }).click();
    await expect(page.getByRole("checkbox", { name: first.name.en })).toBeChecked();
    await page.getByRole("textbox", { name: /comment/i }).fill("Extra crispy, please");
    await page.getByRole("button", { name: /review/i }).click();

    const link = page.getByRole("link", {
      name: new RegExp(`send to ${menu.recipient.name.en}`, "i"),
    });
    await expect(link).toBeVisible();
    const href = new URL((await link.getAttribute("href"))!);
    expect(href.origin + href.pathname).toBe(`https://wa.me/${menu.recipient.whatsappNumber}`);
    const text = href.searchParams.get("text")!;
    expect(text).toContain("Pizza order from Henrik");
    expect(text).toContain(`${first.emoji} ${first.name.en}`);
    expect(text).toContain(`${second.emoji} ${second.name.en}`);
    expect(text).toContain("🧑‍🍳 Make my own pizza: No");
    expect(text).toContain("💬 Comment:\nExtra crispy, please");
  });

  test("fits the viewport without horizontal scrolling", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/your name/i).fill("Anna");
    await page.getByRole("button", { name: /pick toppings/i }).click();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    // The sticky action bar must be reachable without scrolling.
    await expect(page.getByRole("button", { name: /review/i })).toBeInViewport();
  });

  test("switches to Swedish, remembers it, and sends a Swedish message", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "Svenska" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vem är hungrig?");
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vem är hungrig?");
    await expect(page.locator("html")).toHaveAttribute("lang", "sv");

    await page.getByLabel("Ditt namn").fill("Anna");
    await page.getByRole("radio", { name: "Ja" }).click();
    await page.getByRole("button", { name: "Välj toppings" }).click();
    await expect(page.getByText(menu.note.sv)).toBeVisible();
    const first = menu.toppings[0]!;
    await page.getByRole("checkbox", { name: first.name.sv }).click();
    await page.getByRole("button", { name: "Granska" }).click();
    const link = page.getByRole("link", { name: `Skicka till ${menu.recipient.name.sv}` });
    const text = new URL((await link.getAttribute("href"))!).searchParams.get("text")!;
    expect(text).toContain("Pizzabeställning från Anna");
    expect(text).toContain(`${first.emoji} ${first.name.sv}`);
    expect(text).toContain("🧑‍🍳 Göra egen pizza: Ja");
  });

  test("remembers the name across reloads", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/your name/i).fill("Anna");
    await page.getByRole("button", { name: /pick toppings/i }).click();
    await page.reload();
    await expect(page.getByLabel(/your name/i)).toHaveValue("Anna");
  });
});
