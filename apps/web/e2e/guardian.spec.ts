import { expect, test } from "@playwright/test";

test("opens directly into the scanner", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /check a health product/i })).toBeVisible();
  await expect(page.getByText(/unlock every guardian lens check for 20 test gen/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /prepare and request assessment/i })).toBeVisible();
});

test("profile is consumer focused and theme choice persists", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: /welcome to guardian lens|guardian member/i })).toBeVisible();
  await expect(page.getByText("One unlock. Every check.")).toBeVisible();
  await expect(page.getByText("Chain ID")).toHaveCount(0);
  await expect(page.getByText("Relay session")).toHaveCount(0);

  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("public demo report is readable without payment", async ({ page }) => {
  await page.goto("/report/GL-DEMO-01842");
  await expect(page.getByText("Public assessment")).toBeVisible();
  await expect(page.getByText("Critical alert")).toBeVisible();
});
