import { expect, test } from "@playwright/test";
import { ADMIN, login } from "./helpers.js";

test.describe("security basics", () => {
  test("responses carry hardening headers", async ({ request }) => {
    const response = await request.get("/login");
    const headers = response.headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("same-origin");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("the health endpoint is public and reveals nothing sensitive", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("indexer endpoints need a token (a browser session is not enough)", async ({ page }) => {
    await login(page, ADMIN);
    for (const url of ["/api/indexer/me", "/api/indexer/disks"]) {
      const response = await page.request.get(url);
      expect(response.status()).toBe(401);
    }
    const post = await page.request.post("/api/indexer/scans", { data: { labelName: "X", stableIndentifier: "y" } });
    expect(post.status()).toBe(401);
  });

  test("thumbnails and open-original links require a session and a valid id", async ({ page, request }) => {
    expect((await request.get("/api/photos/1/thumbnail")).status()).toBe(401);
    await login(page, ADMIN);
    expect((await page.request.get("/api/photos/abc/thumbnail")).status()).toBe(404);
    expect((await page.request.get("/api/photos/0/thumbnail")).status()).toBe(404);
    expect((await page.request.get("/api/photos/..%2F..%2F.env/thumbnail")).status()).toBe(404);
    expect((await page.request.get("/api/photos/99999999/thumbnail")).status()).toBe(404);
    expect((await page.request.get("/api/photos/99999999/open", { maxRedirects: 0 })).status()).toBe(404);
  });

  test("no page leaks secrets or absolute server paths", async ({ page }) => {
    await login(page, ADMIN);
    for (const url of ["/dashboard", "/hard-disks", "/settings", "/search"]) {
      const response = await page.goto(url);
      const html = await response.text();
      expect(html).not.toMatch(/SESSION_SECRET|DATABASE_URL|passwordHash|postgres:\/\//);
      expect(html).not.toMatch(/[A-Z]:\\\\Users|\/home\/\w+\//);
    }
  });

  test("unknown routes show a 404 page, not a stack trace", async ({ page }) => {
    await login(page, ADMIN);
    // The page streams, so the HTTP status may already be 200; what matters is the friendly 404 content.
    await page.goto("/photos/99999999");
    await expect(page.getByText("This page could not be found")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/at \w+ \(/);
    await page.goto("/photos/not-a-number");
    await expect(page.getByText("This page could not be found")).toBeVisible();
  });
});
