import { expect, test } from "@playwright/test";

test("shows Google sign-in and the calculator introduction", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Smart Battle Calculator", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
  await page.getByRole("button", { name: "View more" }).click();
  await expect(page.getByRole("heading", { name: "Add several Pokemon at once" })).toBeVisible();
});
