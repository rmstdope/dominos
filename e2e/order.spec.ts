import { expect, test } from "@playwright/test";
import menu from "../config/menu.json" with { type: "json" };

test.describe("ordering a pizza", () => {
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
    await page.getByRole("checkbox", { name: first.name }).click();
    await page.getByRole("checkbox", { name: second.name }).click();
    await expect(page.getByRole("checkbox", { name: first.name })).toBeChecked();
    await page.getByRole("button", { name: /review/i }).click();

    const link = page.getByRole("link", {
      name: new RegExp(`send to ${menu.recipient.name}`, "i"),
    });
    await expect(link).toBeVisible();
    const href = new URL((await link.getAttribute("href"))!);
    expect(href.origin + href.pathname).toBe(`https://wa.me/${menu.recipient.whatsappNumber}`);
    const text = href.searchParams.get("text")!;
    expect(text).toContain("Pizza order from Henrik");
    expect(text).toContain(`${first.emoji} ${first.name}`);
    expect(text).toContain(`${second.emoji} ${second.name}`);
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

  test("remembers the name across reloads", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/your name/i).fill("Anna");
    await page.getByRole("button", { name: /pick toppings/i }).click();
    await page.reload();
    await expect(page.getByLabel(/your name/i)).toHaveValue("Anna");
  });
});
