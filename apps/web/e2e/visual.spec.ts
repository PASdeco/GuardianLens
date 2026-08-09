import { expect, test } from "@playwright/test";

test("desktop scanner is framed and nonblank", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop capture only");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /check a health product/i })).toBeVisible();
  const image = page.getByAltText("Sealed medicine and supplement blister packaging");
  await expect(image).toBeVisible();
  expect(await image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: "artifacts/qa/scanner-desktop.png", fullPage: true });
});

test("mobile navigation and scanner fit the viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile capture only");
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.screenshot({ path: "artifacts/qa/scanner-mobile.png", fullPage: true });
  await page.getByRole("link", { name: "History" }).click();
  await expect(page.getByRole("heading", { name: "Scan history" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: "artifacts/qa/history-mobile.png", fullPage: true });
});

test("public report renders its assessment hierarchy", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop capture only");
  await page.goto("/report/GL-DEMO-01842");
  await expect(page.getByRole("heading", { name: "Herbal Metabolism Capsules" })).toBeVisible();
  await expect(page.getByText("Critical alert")).toBeVisible();
  await page.screenshot({ path: "artifacts/qa/public-report-desktop.png", fullPage: true });
});

test("profile is polished in light and dark themes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop capture only");
  await page.goto("/profile");
  await expect(page.getByText("One unlock. Every check.")).toBeVisible();
  await page.screenshot({ path: "artifacts/qa/profile-light-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "artifacts/qa/profile-dark-desktop.png", fullPage: true });
});
