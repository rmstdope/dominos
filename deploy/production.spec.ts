import { expect, test } from "@playwright/test";

test("the production images serve a real sign-in and authenticated screen", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel(/^email/i).fill("baker@example.com");
  await page.getByLabel(/^password/i).fill("pizzapizza");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pizza events");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pizza events");
  const cookie = (await page.context().cookies()).find((c) => c.name === "dominos_session");
  expect(cookie).toMatchObject({ secure: true, httpOnly: true, sameSite: "Lax" });
});
