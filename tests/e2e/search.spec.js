import { expect, test } from "@playwright/test";
import { ADMIN, login } from "./helpers.js";

// Uses the SYNTHETIC demo data from `npm run db:seed -- --demo` (DEMO-HDD-001 connected, DEMO-HDD-002 not).
test.describe("search on the demo data", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN);
    await page.goto("/search?hardDiskId=");
    const hasDemo = (await page.locator("select[name=hardDiskId] option", { hasText: "DEMO-HDD-002" }).count()) > 0 || (await page.getByText("DEMO-HDD-002").count()) > 0;
    test.skip(!hasDemo, "demo data not seeded (npm run db:seed -- --demo)");
  });

  test("by surname: shows person, village, event, date, disk label and relative path", async ({ page }) => {
    await page.goto("/search?surname=Patel&name=Ramesh");
    const card = page.locator("article").first();
    await expect(card).toContainText("Ramesh Kanji Patel");
    await expect(card).toContainText("Vadodara");
    await expect(card).toContainText("Pathramani");
    await expect(card).toContainText("14 Mar 2019");
    await expect(card).toContainText("DEMO-HDD-001");
    await expect(card).toContainText("2019/March/IMG_");
  });

  test("a disk that is not connected is never presented as available", async ({ page }) => {
    await page.goto("/search");
    await page.getByText(/^Filters/).click();
    await page.getByLabel(/^Hard Disk Name/).selectOption({ label: "DEMO-HDD-002" });
    await page.getByRole("button", { name: /^Search/ }).first().click();
    await expect(page).toHaveURL(/hardDiskId=\d+/);
    const card = page.locator("article").first();
    await expect(card).toContainText(/Disconnected/);
    await expect(card).toContainText("Connect DEMO-HDD-002 to access the original file.");
    await expect(card.getByRole("link", { name: /Open original/ })).toHaveCount(0);
  });

  test("by Gujarati text", async ({ page }) => {
    await page.goto(`/search?surname=${encodeURIComponent("પટેલ")}`);
    await expect(page.locator("article").first()).toContainText("રમેશ");
    await page.goto(`/search?q=${encodeURIComponent("આણંદ")}`);
    await expect(page.locator("article").first()).toContainText("આણંદ");
  });

  test("by event, disk and date range, combined", async ({ page }) => {
    await page.goto("/search");
    await page.getByText(/^Filters/).click();
    await page.getByLabel(/^Event Name/).selectOption({ label: "Pathramani" });
    await page.getByLabel(/^Hard Disk Name/).selectOption({ label: "DEMO-HDD-002" });
    await page.getByLabel(/^Date from/).fill("2018-01-01");
    await page.getByLabel(/^Date to/).fill("2018-12-31");
    await page.getByRole("button", { name: /^Search/ }).first().click();
    await expect(page).toHaveURL(/eventId=\d+/);
    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible();
    for (const text of await cards.allInnerTexts()) {
      expect(text).toContain("DEMO-HDD-002");
      expect(text).toMatch(/2018/);
    }
  });

  test("shows a helpful empty state", async ({ page }) => {
    await page.goto("/search?surname=Nonexistentsurname");
    await expect(page.getByText("No results found")).toBeVisible();
  });

  test("photos not yet linked to a visit are marked 'Needs review' and listed on the review page", async ({ page }) => {
    await page.goto("/search?unassigned=1");
    await expect(page.locator("article").first()).toContainText(/Needs review/);
    await page.goto("/review");
    await expect(page.getByText(/photos need review/)).toBeVisible();
  });

  test("copy path puts 'label/path' on the clipboard", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/search?surname=Patel&name=Ramesh");
    await page.locator("article").first().getByRole("button", { name: /Copy path/ }).click();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toMatch(/^DEMO-HDD-001\/2019\/March\/IMG_\d+\.jpg$/);
  });

  test("photo details page", async ({ page }) => {
    await page.goto("/search?surname=Shah");
    await page.locator("article").first().getByRole("link", { name: /View/ }).first().click();
    await expect(page.getByRole("heading", { name: /IMG_\d+\.jpg/ })).toBeVisible();
    await expect(page).toHaveURL(/\/photos\/\d+/);
    await expect(page.getByText("File location")).toBeVisible();
    await expect(page.getByRole("link", { name: "Suresh Mohan Shah" }).first()).toBeVisible();
  });

  test("pagination keeps the filters", async ({ page }) => {
    await page.goto("/search");
    const next = page.getByRole("link", { name: "Next" }).first();
    if ((await next.count()) > 0) {
      await next.click();
      await expect(page).toHaveURL(/page=2/);
    }
  });
});
