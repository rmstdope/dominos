import { expect, test, type Page } from "@playwright/test";

test.use({ locale: "en-GB", timezoneId: "Europe/Stockholm" });

/** YYYY-MM-DD `days` from now, for date inputs. */
function inDays(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
}

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel(/^email/i).fill("baker@example.com");
  await page.getByLabel(/^password/i).fill("pizzapizza");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/hi the baker/i);
}

// Runs after sign-in.spec.ts, which set the staff member's password.
test("staff set up the pantry, plan an event and invite a guest", async ({ page }) => {
  const heading = page.getByRole("heading", { level: 1 });
  await signIn(page);
  await page.getByRole("link", { name: /staff console/i }).click();
  await expect(heading).toHaveText("Events");
  await expect(page.getByText(/no events planned/i)).toBeVisible();

  // Pantry: a group, then an ingredient in it.
  await page
    .getByRole("navigation", { name: "Staff" })
    .getByRole("link", { name: "Ingredients" })
    .click();
  await expect(heading).toHaveText("Ingredients");
  const groups = page.getByRole("region", { name: "Groups" });
  await groups.getByLabel("Name · English").fill("Meat");
  await groups.getByLabel("Name · Svenska").fill("Kött");
  await groups.getByRole("button", { name: "Add group" }).click();
  await expect(groups.getByText("Meat")).toBeVisible();

  await page.getByLabel("Name · English").first().fill("Ham");
  await page.getByLabel("Name · Svenska").first().fill("Skinka");
  await page.getByRole("button", { name: "Add ingredient" }).click();
  await expect(page.getByRole("checkbox", { name: "Ham in stock" })).toBeChecked();

  // An event with that menu, saved as a draft and then published.
  await page
    .getByRole("navigation", { name: "Staff" })
    .getByRole("link", { name: "Events" })
    .click();
  await page.getByRole("link", { name: "New event" }).click();
  await expect(heading).toHaveText("New event");
  await page.getByLabel("Name", { exact: true }).fill("Friday Pizza Night");
  await page.getByLabel("Date", { exact: true }).fill(inDays(10));
  await page.getByLabel("Starts").fill("18:30");
  await page.getByLabel("Where").fill("At the Kurelids'");
  await page.getByLabel("Orders close on").fill(inDays(8));
  await page.getByLabel("at", { exact: true }).fill("20:00");
  await page.getByLabel("Max toppings").fill("6");
  await expect(page.getByRole("checkbox", { name: "Ham" })).toBeChecked();
  await page.getByRole("button", { name: "Create draft" }).click();

  await expect(heading).toHaveText("Friday Pizza Night");
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Orders open", { exact: true })).toBeVisible();

  // Reloading shows what the server kept.
  await page.reload();
  await expect(page.getByLabel("Starts")).toHaveValue("18:30");
  await expect(page.getByLabel("Max toppings")).toHaveValue("6");

  await page.getByRole("link", { name: /all events/i }).click();
  await expect(page.getByRole("link", { name: "Friday Pizza Night" })).toBeVisible();

  // A guest, invited by email.
  await page
    .getByRole("navigation", { name: "Staff" })
    .getByRole("link", { name: "People" })
    .click();
  await expect(heading).toHaveText("People");
  await page.getByLabel("Name", { exact: true }).fill("Anna Berg");
  await page.getByLabel("Email").fill("anna@example.com");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByRole("status")).toHaveText(/invitation sent to anna@example.com/i);
  const anna = page.getByRole("row").filter({ hasText: "anna@example.com" });
  await expect(anna.getByText("Invite pending")).toBeVisible();

  // The only staff member cannot step down.
  const me = page.getByRole("row").filter({ hasText: "baker@example.com" });
  await me.getByRole("combobox", { name: /role for/i }).selectOption("customer");
  await expect(me.getByRole("alert")).toHaveText(/at least one staff member/i);
  await expect(me.getByRole("combobox", { name: /role for/i })).toHaveValue("staff");
});
