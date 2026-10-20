import { expect, test } from "@playwright/test";
import { ADMIN, alertBox, login, logout, unique } from "./helpers.js";

test.describe("authentication", () => {
  test("anonymous visitors are sent to the login page", async ({ page }) => {
    for (const url of ["/dashboard", "/search", "/hard-disks", "/users", "/settings", "/visits/new"]) {
      await page.goto(url);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("private APIs answer 401 without a session", async ({ request }) => {
    for (const url of ["/api/photos/1/thumbnail", "/api/photos/1/open"]) {
      const response = await request.get(url, { maxRedirects: 0 });
      expect(response.status()).toBe(401);
    }
  });

  test("a wrong password shows a generic error and does not log in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(ADMIN.email);
    await page.getByLabel(/^Password/).fill("definitely-wrong");
    await page.getByRole("button", { name: /Log in/ }).click();
    await expect(alertBox(page)).toContainText("Invalid email or password.");
    await expect(page).toHaveURL(/\/login/);
  });

  test("an unknown e-mail gets the same error as a wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(`${unique("nobody")}@example.test`);
    await page.getByLabel(/^Password/).fill("whatever-123456");
    await page.getByRole("button", { name: /Log in/ }).click();
    await expect(alertBox(page)).toContainText("Invalid email or password.");
  });

  test("logging in and out", async ({ page }) => {
    await login(page, ADMIN);
    await expect(page.getByRole("heading", { name: /Dashboard/ })).toBeVisible();
    // already signed in: the login page bounces to the dashboard
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard/);
    await logout(page);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("the session cookie is HttpOnly and SameSite=Lax", async ({ page, context }) => {
    await login(page, ADMIN);
    const cookie = (await context.cookies()).find((c) => c.name === "gpa_session");
    expect(cookie).toBeTruthy();
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("Lax");
  });

  test("repeated wrong passwords are rate limited", async ({ page }) => {
    const email = `${unique("victim")}@example.test`;
    await page.goto("/login");
    for (let i = 0; i < 5; i += 1) {
      await page.getByLabel("Email").fill(email);
      await page.getByLabel(/^Password/).fill(`wrong-password-${i}`);
      await page.getByRole("button", { name: /Log in/ }).click();
      await expect(alertBox(page)).toContainText("Invalid email or password.");
    }
    await page.getByLabel(/^Password/).fill("wrong-password-again");
    await page.getByRole("button", { name: /Log in/ }).click();
    await expect(alertBox(page)).toContainText(/Too many failed attempts/);
  });

  test("a changed password logs out other sessions", async ({ browser }) => {
    // admin creates a throw-away staff user
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await login(adminPage, ADMIN);
    const email = `${unique("pwuser")}@example.test`;
    await adminPage.goto("/users");
    const form = adminPage.locator("form").filter({ has: adminPage.getByRole("button", { name: /^Add/ }) }).first();
    await form.getByLabel(/^Name/).fill("Password Tester");
    await form.getByLabel(/^Email/).fill(email);
    await form.getByLabel(/Temporary password/).fill("first-password-123");
    await form.getByRole("button", { name: /^Add/ }).click();
    await expect(adminPage.getByRole("status")).toContainText(email);

    // the user logs in on two "devices"
    const a = await browser.newContext();
    const b = await browser.newContext();
    const pageA = await a.newPage();
    const pageB = await b.newPage();
    await login(pageA, { email, password: "first-password-123" });
    await login(pageB, { email, password: "first-password-123" });

    // device A changes the password
    await pageA.goto("/account");
    await pageA.getByLabel(/^Current password/).fill("first-password-123");
    await pageA.getByLabel(/^New password/).fill("second-password-456");
    await pageA.getByLabel(/^Repeat new password/).fill("second-password-456");
    await pageA.getByRole("button", { name: /Change password/ }).click();
    await expect(pageA.getByRole("status")).toContainText("Password changed");

    // device B is signed out, device A stays signed in
    await pageB.goto("/dashboard");
    await expect(pageB).toHaveURL(/\/login/);
    await pageA.goto("/dashboard");
    await expect(pageA).toHaveURL(/\/dashboard/);

    await Promise.all([adminContext.close(), a.close(), b.close()]);
  });
});
