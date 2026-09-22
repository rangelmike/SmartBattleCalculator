import { expect, test } from "@playwright/test";

test("shows the project shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /base lista/i })).toBeVisible();
});
