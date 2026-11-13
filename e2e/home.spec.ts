import { expect, test } from "@playwright/test";

test("home screen shows the game title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Qubit Quest");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Qubit Quest");
});
