import { expect, test } from "@playwright/test";
import { ADMIN, alertBox, login, unique } from "./helpers.js";

test.describe("role based access", () => {
  const password = "staff-password-123";
  let staffEmail;

  test.beforeAll(async ({ browser }) => {
    staffEmail = `${unique("staff")}@example.test`;
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, ADMIN);
    await page.goto("/users");
    const form = page.locator("form").filter({ has: page.getByRole("button", { name: /^Add/ }) }).first();
    await form.getByLabel(/^Name/).fill("E2E Staff");
    await form.getByLabel(/^Email/).fill(staffEmail);
    await form.getByLabel(/^Role/).selectOption("STAFF");
    await form.getByLabel(/Temporary password/).fill(password);
    await form.getByRole("button", { name: /^Add/ }).click();
    await expect(page.getByRole("status")).toContainText(staffEmail);
    await context.close();
  });

  test("staff do not see admin navigation and are redirected away from admin pages", async ({ page }) => {
    await login(page, { email: staffEmail, password });
    const nav = page.getByRole("navigation", { name: "Main" }).first();
    await expect(nav.getByRole("link", { name: /^Search/ })).toBeVisible();
    await expect(nav.getByRole("link", { name: /^Users/ })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: /^Settings/ })).toHaveCount(0);

    for (const url of ["/users", "/settings"]) {
      await page.goto(url);
      await expect(page).toHaveURL(/\/dashboard/);
    }
  });

  test("staff can search, manage people and register disks but cannot deactivate disks or add events", async ({ page }) => {
    await login(page, { email: staffEmail, password });
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: /^Search/ })).toBeVisible();
    await page.goto("/haribhagats/new");
    await expect(page).toHaveURL(/\/haribhagats\/new/);

    await page.goto("/hard-disks");
    await expect(page.getByRole("heading", { name: /^Hard Disks/ })).toBeVisible();
    await expect(page.getByText("Register a hard disk")).toBeVisible();
    await expect(page.getByRole("button", { name: /Deactivate/ })).toHaveCount(0);

    await page.goto("/events");
    await expect(page.getByText("Add an event")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Deactivate/ })).toHaveCount(0);
  });

  test("a deactivated user is locked out immediately", async ({ browser }) => {
    const email = `${unique("gone")}@example.test`;
    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await login(admin, ADMIN);
    await admin.goto("/users");
    const form = admin.locator("form").filter({ has: admin.getByRole("button", { name: /^Add/ }) }).first();
    await form.getByLabel(/^Name/).fill("Soon Gone");
    await form.getByLabel(/^Email/).fill(email);
    await form.getByLabel(/Temporary password/).fill(password);
    await form.getByRole("button", { name: /^Add/ }).click();
    await expect(admin.getByRole("status")).toContainText(email);

    const userContext = await browser.newContext();
    const user = await userContext.newPage();
    await login(user, { email, password });

    // admin deactivates the user
    await admin.goto("/users");
    const row = admin.getByRole("row", { name: new RegExp(email) });
    await row.getByText(/^Edit/).click();
    await row.getByRole("checkbox").uncheck();
    await row.getByRole("button", { name: /^Save/ }).click();
    await expect(row.getByText(/saved|updated/i).first()).toBeVisible({ timeout: 15_000 }).catch(() => {});

    // the existing session stops working on the next request, and logging in again fails
    await user.goto("/dashboard");
    await expect(user).toHaveURL(/\/login/);
    await user.getByLabel("Email").fill(email);
    await user.getByLabel(/^Password/).fill(password);
    await user.getByRole("button", { name: /Log in/ }).click();
    await expect(alertBox(user)).toContainText("Invalid login or password.");

    await Promise.all([adminContext.close(), userContext.close()]);
  });
});
