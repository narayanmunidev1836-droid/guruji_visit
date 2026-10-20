import { expect, test } from "@playwright/test";
import { ADMIN, gujaratiDigits, login, unique, uniqueMobile } from "./helpers.js";

test.describe("Haribhagat directory", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN);
  });

  async function fill(page, values) {
    for (const [label, value] of Object.entries(values)) {
      await page.getByLabel(new RegExp(`^${label}`)).first().fill(value);
    }
  }

  test("creates a person with all fields, finds them by several fields, and edits them", async ({ page }) => {
    const surname = unique("Testsur");
    const mobile = uniqueMobile();
    await page.goto("/haribhagats/new");
    await fill(page, {
      Name: "Ramesh",
      "Father Name": "Kanji",
      Surname: surname,
      "Gam \\(Village\\)": "Vadodara",
      Taluko: "Vadodara",
      "Jillo \\(District\\)": "Vadodara",
      Pincode: "390001",
      "Mobile No": `${mobile.slice(0, 5)} ${mobile.slice(5)}`, // typed with a space, stored without
    });
    await page.getByRole("button", { name: /^Save/ }).click();
    await expect(page).toHaveURL(/\/haribhagats\/\d+$/);
    await expect(page.getByRole("heading", { name: new RegExp(surname) })).toBeVisible();
    await expect(page.getByText(mobile)).toBeVisible(); // normalised and stored as text
    await expect(page.getByText("390001")).toBeVisible();

    // searchable by surname, full name, pincode and mobile number
    for (const q of [surname.toLowerCase(), `ramesh ${surname}`, mobile.slice(0, 6)]) {
      await page.goto(`/haribhagats?q=${encodeURIComponent(q)}`);
      await expect(page.getByRole("link", { name: new RegExp(surname) }).first()).toBeVisible();
    }
    await page.goto(`/haribhagats?q=${encodeURIComponent(`390001 ${surname}`)}`);
    await expect(page.getByRole("link", { name: new RegExp(surname) })).toBeVisible();

    // edit
    await page.goto(`/haribhagats?q=${surname}`);
    await page.getByRole("link", { name: new RegExp(surname) }).first().click();
    await page.getByRole("link", { name: /Edit/ }).first().click();
    await page.getByLabel(/^Gam/).fill("Surat");
    await page.getByRole("button", { name: /^Save/ }).click();
    await expect(page).toHaveURL(/\/haribhagats\/\d+$/);
    await expect(page.getByText("Surat").first()).toBeVisible();
  });

  test("shows possible duplicates and lets the user create anyway", async ({ page }) => {
    const surname = unique("Dupsur");
    const person = { Name: "Hitesh", "Father Name": "Bhikha", Surname: surname, "Gam \\(Village\\)": "Navsari" };

    await page.goto("/haribhagats/new");
    await fill(page, person);
    await page.getByRole("button", { name: /^Save/ }).click();
    await expect(page).toHaveURL(/\/haribhagats\/\d+$/);

    // the same person again (different case and spacing)
    await page.goto("/haribhagats/new");
    await fill(page, { ...person, Name: " hitesh ", Surname: surname.toUpperCase() });
    await page.getByRole("button", { name: /^Save/ }).click();
    const warning = page.locator('div[role="alert"]', { hasText: /similar Haribhagat already exists/ });
    await expect(warning).toBeVisible();
    await expect(warning.getByRole("link", { name: /Open existing record/ })).toBeVisible();
    await expect(page).toHaveURL(/\/haribhagats\/new/);
    // what the user typed is still in the form
    await expect(page.getByLabel(/^Name/).first()).toHaveValue(" hitesh ");

    await warning.getByRole("button", { name: /Save anyway/ }).click();
    await expect(page).toHaveURL(/\/haribhagats\/\d+$/);
    await page.goto(`/haribhagats?q=${surname}`);
    await expect(page.getByRole("link", { name: new RegExp(surname, "i") })).toHaveCount(2);
  });

  test("validates required fields, mobile number and pincode", async ({ page }) => {
    await page.goto("/haribhagats/new");
    await fill(page, { Name: "Test", Surname: unique("Val"), Pincode: "123", "Mobile No": "12345" });
    await page.getByRole("button", { name: /^Save/ }).click();
    await expect(page.getByText("Pincode must be 6 digits.")).toBeVisible();
    await expect(page.getByText("Enter a valid 10 digit mobile number.")).toBeVisible();
    await expect(page).toHaveURL(/\/haribhagats\/new/);
  });

  test("supports Gujarati names and search", async ({ page }) => {
    const surname = `પટેલ${gujaratiDigits(Date.now())}`;
    await page.goto("/haribhagats/new");
    await fill(page, { Name: "રમેશ", Surname: surname, "Gam \\(Village\\)": "આણંદ" });
    await page.getByRole("button", { name: /^Save/ }).click();
    await expect(page).toHaveURL(/\/haribhagats\/\d+$/);
    await page.goto(`/haribhagats?q=${encodeURIComponent("રમેશ આણંદ")}`);
    await expect(page.getByRole("link", { name: new RegExp(surname) })).toBeVisible();
  });
});
