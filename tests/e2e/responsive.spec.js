import { expect, test } from "@playwright/test";
import { ADMIN, login } from "./helpers.js";

const PAGES = ["/dashboard", "/search", "/haribhagats", "/events", "/hard-disks", "/scans", "/visits", "/visits/new", "/review"];

test.describe("mobile layout (390 x 844)", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test.setTimeout(180_000);

  test("no page needs horizontal scrolling and the menu works", async ({ page }) => {
    await login(page, ADMIN);
    for (const url of PAGES) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${url} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1);
    }

    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
    await page.getByRole("button", { name: "Open menu" }).click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("link", { name: /^Search/ }).click();
    await expect(page).toHaveURL(/\/search/);
    await expect(page.getByRole("dialog", { name: "Menu" })).toHaveCount(0); // closes after navigating
  });

  test("the login page fits a phone", async ({ page }) => {
    await page.goto("/login");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByRole("button", { name: /Log in/ })).toBeVisible();
  });
});

test.describe("desktop layout", () => {
  test("shows the sidebar and no menu button", async ({ page }) => {
    await login(page, ADMIN);
    await expect(page.getByRole("navigation", { name: "Main" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
  });
});
