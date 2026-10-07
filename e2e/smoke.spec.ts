import { expect, test } from "@playwright/test";

test("shows Google sign-in and the calculator introduction", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Smart Battle Calculator", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true })
  ).toBeEnabled();
  await expect(
    page.getByLabel("Calculator features").getByRole("button", { name: "View more", exact: true })
  ).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "View more", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Start a new battle", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "View less", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Start a new battle", exact: true })).toHaveCount(
    0
  );
});
