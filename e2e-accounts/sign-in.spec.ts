import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test.use({ locale: "en-GB" });

/** The link create-staff printed before the API started. */
function invitationLink(): string {
  const printed = readFileSync(".e2e-accounts/invitation.txt", "utf8");
  const link = printed.match(/https?:\/\/\S+\/invitation#\S+/)?.[0];
  if (!link) throw new Error(`No invitation link in: ${printed}`);
  return link;
}

test("the first staff member accepts the invitation, signs out and signs back in", async ({
  page,
}) => {
  const heading = page.getByRole("heading", { level: 1 });

  await page.goto("/");
  await expect(heading).toHaveText(/pizza night, sorted/i);

  const link = invitationLink();
  await page.goto(link);
  await expect(page.getByLabel(/^email/i)).toHaveValue("baker@example.com");
  // The token is dropped from the address bar once read.
  await expect(page).toHaveURL(/\/invitation$/);
  await expect(page.getByLabel(/your name/i)).toHaveValue("The Baker");
  await page.getByLabel(/choose a password/i).fill("pizzapizza");
  await page.getByRole("button", { name: /join/i }).click();

  await expect(heading).toHaveText("Pizza events");
  await expect(page.getByText("Hi The Baker")).toBeVisible();
  await expect(page.getByRole("link", { name: "Staff console" })).toBeVisible();

  // The session is a cookie, so it survives a reload.
  await page.reload();
  await expect(heading).toHaveText("Pizza events");

  await page.getByRole("link", { name: "Profile" }).click();
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(heading).toHaveText(/pizza night, sorted/i);

  await page.getByLabel(/^email/i).fill("baker@example.com");
  await page.getByLabel(/^password/i).fill("not the password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("alert")).toHaveText(/wrong email or password/i);

  await page.getByLabel(/^password/i).fill("pizzapizza");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(heading).toHaveText("Pizza events");

  // The invitation worked once.
  await page.goto(link);
  await expect(heading).toHaveText(/invitation has expired/i);
});

test("a forgotten password leads to a check-your-email screen", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("link", { name: /forgot password/i }).click();
  // Navigations render in a transition: the sign-in form, with its own email field, can still be
  // on screen for a moment after the address changes.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/forgot your password/i);
  await page.getByLabel(/^email/i).fill("someone@example.com");
  await page.getByRole("button", { name: /send reset link/i }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/check your email/i);
});
