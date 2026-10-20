import path from "node:path";
import { test } from "@playwright/test";
import { ADMIN, login } from "./helpers.js";

// Saves screenshots of the main pages for visual review. Only runs when E2E_SCREENSHOTS_DIR is set:
//   E2E_SCREENSHOTS_DIR=./tmp/shots npx playwright test visual
const dir = process.env.E2E_SCREENSHOTS_DIR;
test.skip(!dir, "set E2E_SCREENSHOTS_DIR to capture screenshots");
test.setTimeout(300_000);

const pages = [
  ["dashboard", "/dashboard"],
  ["search", "/search"],
  ["search-filtered", "/search?surname=Patel"],
  ["review", "/review"],
  ["haribhagats", "/haribhagats"],
  ["events", "/events"],
  ["hard-disks", "/hard-disks"],
  ["scans", "/scans"],
  ["visits", "/visits"],
  ["visit-new", "/visits/new"],
  ["users", "/users"],
  ["settings", "/settings"],
];

test("desktop screenshots", async ({ page }) => {
  await page.goto("/login");
  await page.screenshot({ path: path.join(dir, "login.png") });
  await login(page, ADMIN);
  for (const [name, url] of pages) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
  }
});

test("mobile screenshots", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  await login(page, ADMIN);
  for (const [name, url] of [["dashboard", "/dashboard"], ["search", "/search"], ["hard-disks", "/hard-disks"]]) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(dir, `mobile-${name}.png`), fullPage: true });
  }
  await context.close();
});
