import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3333";
const TIMESTAMP = Date.now();
const TEST_EMAIL = `test.${TIMESTAMP}@playwright.test`;
const TEST_PASSWORD = "testpassword123";
const TEST_NAME = "Playwright User";

test.describe("Authentication", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto(`${BASE}/uk/login`);
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });

  test("register page renders correctly", async ({ page }) => {
    await page.goto(`${BASE}/uk/register`);
    await expect(page.locator("input#name")).toBeVisible();
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
    await expect(page.locator("input#confirmPassword")).toBeVisible();
  });

  test("login with wrong credentials shows error", async ({ page }) => {
    await page.goto(`${BASE}/uk/login`);
    await page.fill("input[type='email']", "nonexistent.wrong@example.com");
    await page.fill("input[type='password']", "wrongpassword123");
    await page.click("button[type='submit']");
    // Wait for button to stop being in loading state, then check for error
    await expect(page.locator("button[type='submit']")).not.toHaveText("...", { timeout: 15000 });
    await expect(page.locator("text=Невірна пошта або пароль")).toBeVisible({ timeout: 15000 });
  });

  test("register validation: passwords do not match", async ({ page }) => {
    await page.goto(`${BASE}/uk/register`);
    await page.fill("input#name", "Test User");
    await page.fill("input#email", `mismatch.${TIMESTAMP}@test.com`);
    await page.fill("input#password", "password123");
    await page.fill("input#confirmPassword", "different456");
    await page.click("button[type='submit']");
    await expect(page.locator("text=Паролі не збігаються")).toBeVisible();
  });

  test("register validation: password too short", async ({ page }) => {
    await page.goto(`${BASE}/uk/register`);
    await page.fill("input#name", "Test User");
    await page.fill("input#email", `short.${TIMESTAMP}@test.com`);
    await page.fill("input#password", "short");
    await page.fill("input#confirmPassword", "short");
    await page.click("button[type='submit']");
    await expect(page.locator("text=Мінімум 8 символів")).toBeVisible();
  });

  test("register new user and redirect to calendar", async ({ page }) => {
    await page.goto(`${BASE}/uk/register`);
    await page.fill("input#name", TEST_NAME);
    await page.fill("input#email", TEST_EMAIL);
    await page.fill("input#password", TEST_PASSWORD);
    await page.fill("input#confirmPassword", TEST_PASSWORD);
    await page.click("button[type='submit']");

    // Should redirect to /uk/calendar
    await expect(page).toHaveURL(/\/uk\/calendar/, { timeout: 10000 });
  });

  test("login with valid credentials and redirect", async ({ page }) => {
    await page.goto(`${BASE}/uk/login`);
    await page.fill("input[type='email']", TEST_EMAIL);
    await page.fill("input[type='password']", TEST_PASSWORD);
    await page.click("button[type='submit']");

    await expect(page).toHaveURL(/\/uk\/calendar/, { timeout: 10000 });
  });

  test("protected route redirects unauthenticated to login", async ({ page }) => {
    // New context = no session
    await page.goto(`${BASE}/uk/calendar`);
    await expect(page).toHaveURL(/\/uk\/login/, { timeout: 5000 });
  });

  test("root / redirects to /uk/login when not authenticated", async ({ page }) => {
    await page.goto(`${BASE}/`);
    await expect(page).toHaveURL(/\/uk\/login|\/uk\/calendar/, { timeout: 5000 });
  });
});
