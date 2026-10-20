import { expect, test } from "@playwright/test";
import { ADMIN, alertBox, login, unique } from "./helpers.js";

test.describe("dynamic master data (events and hard disks)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN);
  });

  const eventOptions = async (page) => {
    await page.goto("/visits/new");
    return page.locator('select[name="eventId"] option').allTextContents();
  };

  const diskOptions = async (page) => {
    await page.goto("/visits/new");
    return page.locator('select[name="diskId"] option').allTextContents();
  };

  test("a new event appears in the Event Name dropdown and a deactivated one disappears", async ({ page }) => {
    const name = unique("E2E Event ");
    await page.goto("/events");
    await page.getByLabel(/^Event Name/).first().fill(name);
    await page.getByRole("button", { name: /^Add/ }).click();
    await expect(page.getByRole("status")).toContainText(name);
    await expect(page.getByRole("row", { name: new RegExp(name) })).toBeVisible();

    expect(await eventOptions(page)).toContain(name);

    await page.goto("/events");
    const row = page.getByRole("row", { name: new RegExp(name) });
    await row.getByRole("button", { name: /Deactivate/ }).click();
    await expect(row.getByText(/Inactive/)).toBeVisible();

    expect(await eventOptions(page)).not.toContain(name);
    // the record is kept (never deleted) and can be re-activated
    await page.goto("/events");
    const again = page.getByRole("row", { name: new RegExp(name) });
    await expect(again).toBeVisible();
    await again.getByRole("button", { name: /Activate/ }).click();
    // wait for the server action to finish before navigating away (navigating would cancel it)
    await expect(again.getByText(/^Active/)).toBeVisible();
    expect(await eventOptions(page)).toContain(name);
  });

  test("duplicate event names are rejected", async ({ page }) => {
    const name = unique("E2E Dup ");
    await page.goto("/events");
    await page.getByLabel(/^Event Name/).first().fill(name);
    await page.getByRole("button", { name: /^Add/ }).click();
    await expect(page.getByRole("status")).toBeVisible();
    await page.getByLabel(/^Event Name/).first().fill(name.toUpperCase());
    await page.getByRole("button", { name: /^Add/ }).click();
    await expect(alertBox(page).first()).toBeVisible();
    await expect(page.getByText(/already exists/i).first()).toBeVisible();
  });

  test("registering a disk makes it selectable; labels are unique ignoring case; deactivating hides it", async ({ page }) => {
    const label = unique("E2E-HDD-").toUpperCase();
    await page.goto("/hard-disks");
    await page.getByLabel(/^Sticker label/).fill(label);
    await page.getByLabel(/^Description/).fill("Created by an automated test");
    await page.getByRole("button", { name: /^Add/ }).click();
    await expect(page.getByRole("status")).toContainText(label);
    await expect(page.getByRole("row", { name: new RegExp(label) })).toContainText("not initialised");

    expect(await diskOptions(page)).toContain(label);

    // same label in another case is refused
    await page.goto("/hard-disks");
    await page.getByLabel(/^Sticker label/).fill(label.toLowerCase());
    await page.getByRole("button", { name: /^Add/ }).click();
    await expect(page.getByText(/already exists/i).first()).toBeVisible();

    await page.getByRole("row", { name: new RegExp(label) }).getByRole("button", { name: /Deactivate/ }).click();
    await expect(page.getByRole("row", { name: new RegExp(label) })).toContainText(/Inactive/);
    expect(await diskOptions(page)).not.toContain(label);
  });

  test("the search filter dropdowns are built from the database too", async ({ page }) => {
    const label = unique("E2E-FILTER-").toUpperCase();
    await page.goto("/hard-disks");
    await page.getByLabel(/^Sticker label/).fill(label);
    await page.getByRole("button", { name: /^Add/ }).click();
    await expect(page.getByRole("status")).toBeVisible();
    await page.goto("/search");
    await page.getByText(/^Filters/).click();
    await expect(page.locator('select[name="hardDiskId"] option', { hasText: label })).toHaveCount(1);
  });
});
