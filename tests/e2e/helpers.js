import { expect } from "@playwright/test";

export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@example.org",
  password: process.env.E2E_ADMIN_PASSWORD ?? "ChangeMe-Dev-2026",
};

export const unique = (prefix) => `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

export async function login(page, { email, password }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole("button", { name: /Log in/ }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function logout(page) {
  await page.getByRole("button", { name: /Log out/ }).first().click();
  await expect(page).toHaveURL(/\/login/);
}

/** Inline form errors / warnings. (Next.js also renders an empty role="alert" route announcer that must be excluded.) */
export const alertBox = (page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');

/** A random, valid 10 digit Indian mobile number - unique per call so the duplicate-mobile warning never fires by accident. */
export const uniqueMobile = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;

/** Gujarati digits for a number, e.g. 2026 -> ૨૦૨૬ (used to build unique Gujarati test names). */
export const gujaratiDigits = (n) => String(n).replace(/\d/g, (d) => "૦૧૨૩૪૫૬૭૮૯"[d]);
