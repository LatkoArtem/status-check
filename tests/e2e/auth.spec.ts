import { test, expect } from "@playwright/test";
import { BASE, TEST_PASSWORD, readUsers, gotoLogin, gotoRegister, login, register, uniqueEmail } from "./helpers";

test.describe("Auth — public pages", () => {
  test("login page renders all controls (uk)", async ({ page }) => {
    await gotoLogin(page, "uk");
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
    await expect(page.locator("h1")).toContainText("Status Check");
  });

  test("login page renders all controls (en)", async ({ page }) => {
    await gotoLogin(page, "en");
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });

  test("register page renders all controls (uk)", async ({ page }) => {
    await gotoRegister(page, "uk");
    await expect(page.locator("input#name")).toBeVisible();
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
    await expect(page.locator("input#confirmPassword")).toBeVisible();
  });

  test("login: wrong credentials show error (uk)", async ({ page }) => {
    await gotoLogin(page, "uk");
    await page.fill("input#email", "nonexistent.user@example.com");
    await page.fill("input#password", "wrongpassword123!");
    await page.click("button[type='submit']");
    await expect(page.locator("text=Невірна пошта або пароль")).toBeVisible({ timeout: 15_000 });
  });

  test("login: wrong credentials show error (en)", async ({ page }) => {
    await gotoLogin(page, "en");
    await page.fill("input#email", "nonexistent.user@example.com");
    await page.fill("input#password", "wrongpassword123!");
    await page.click("button[type='submit']");
    await expect(page.locator("text=Invalid email or password")).toBeVisible({ timeout: 15_000 });
  });

  test("register: passwords-mismatch validation", async ({ page }) => {
    await gotoRegister(page, "uk");
    await page.fill("input#name", "Test");
    await page.fill("input#email", uniqueEmail("mismatch"));
    await page.fill("input#password", "validpass1");
    await page.fill("input#confirmPassword", "differentpass1");
    await page.click("button[type='submit']");
    await expect(page.locator("text=Паролі не збігаються")).toBeVisible();
  });

  test("register: password-too-short validation", async ({ page }) => {
    await gotoRegister(page, "uk");
    await page.fill("input#name", "Test");
    await page.fill("input#email", uniqueEmail("short"));
    await page.fill("input#password", "short");
    await page.fill("input#confirmPassword", "short");
    await page.click("button[type='submit']");
    await expect(page.locator("text=Мінімум 8 символів")).toBeVisible();
  });

  test("protected route redirects unauth user to login", async ({ page }) => {
    await page.goto(`${BASE}/uk/calendar`);
    await expect(page).toHaveURL(/\/uk\/login/, { timeout: 10_000 });
  });

  test("root / redirects unauth user to login", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await expect(page).toHaveURL(/\/uk\/(login|calendar)/, { timeout: 10_000 });
  });

  test("auth page redirects authenticated user to calendar", async ({ browser }) => {
    const { admin } = readUsers();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, admin.email, admin.password);
    await page.goto(`${BASE}/uk/login`);
    await expect(page).toHaveURL(/\/uk\/calendar/, { timeout: 10_000 });
    await ctx.close();
  });
});

test.describe("Auth — fresh registration", () => {
  test("register a fresh user and land on calendar", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const email = uniqueEmail("fresh");
    await register(page, {
      name: "Fresh User",
      email,
      password: TEST_PASSWORD,
    });
    await expect(page).toHaveURL(/\/uk\/calendar/);
    await ctx.close();
  });
});

test.describe("Auth — logout", () => {
  // Use a dedicated, single-use user so global signOut() doesn't revoke the
  // shared admin/member sessions used by other test files.
  test("dedicated user can log out and is redirected to login", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const email = uniqueEmail("logout");
    await register(page, {
      name: "Logout User",
      email,
      password: TEST_PASSWORD,
    });
    await expect(page).toHaveURL(/\/uk\/calendar/);

    await page.click(
      "button[aria-label='Вийти'], button[aria-label='Sign out']",
    );
    await expect(page).toHaveURL(/\/uk\/login/, { timeout: 15_000 });
    await ctx.close();
  });
});
