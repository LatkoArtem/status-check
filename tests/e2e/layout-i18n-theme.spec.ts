import { test, expect } from "@playwright/test";
import { BASE } from "./helpers";

test.use({ storageState: "playwright/.auth/admin.json" });

test.describe("Layout — sidebar + header", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${BASE}/uk/calendar`);
  });

  test("sidebar shows three nav links", async ({ page }) => {
    await expect(page.locator("aside a:has-text('Календар')")).toBeVisible();
    await expect(page.locator("aside a:has-text('Зобов\\'язання')")).toBeVisible();
    await expect(page.locator("aside a:has-text('Налаштування')")).toBeVisible();
  });

  test("header is rendered with logout button", async ({ page }) => {
    await expect(page.locator("header")).toBeVisible();
    await expect(
      page.locator("button[aria-label='Вийти'], button[aria-label='Sign out']"),
    ).toBeVisible();
  });

  test("navigating to commitments updates active nav", async ({ page }) => {
    await page.click("aside a:has-text('Зобов\\'язання')");
    await expect(page).toHaveURL(/\/uk\/commitments/);
    await expect(page.locator("aside a:has-text('Зобов\\'язання')")).toHaveClass(/bg-accent/);
  });
});

test.describe("Layout — mobile sidebar", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/uk/calendar`);
  });

  test("sidebar is hidden by default", async ({ page }) => {
    const sidebar = page.locator("aside").first();
    // It has -translate-x-full class when closed (off-screen)
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });

  test("hamburger opens sidebar; backdrop click closes", async ({ page }) => {
    const hamburger = page.locator(
      "button[aria-label='Відкрити меню'], button[aria-label='Open menu']",
    );
    await expect(hamburger).toBeVisible();
    await hamburger.click();
    const sidebar = page.locator("aside").first();
    await expect(sidebar).toHaveClass(/translate-x-0/);
    // Backdrop click — click near the top-right where the sidebar doesn't cover.
    await page.locator(".fixed.inset-0.z-30").click({
      position: { x: page.viewportSize()!.width - 20, y: 100 },
    });
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });
});

test.describe("i18n — locale switch", () => {
  test("switching locale changes URL and text", async ({ page }) => {
    await page.goto(`${BASE}/uk/calendar`);
    await expect(page.locator("h1")).toContainText("Календар");
    await page.click("button:has-text('EN')");
    await expect(page).toHaveURL(/\/en\/calendar/, { timeout: 10_000 });
    await expect(page.locator("h1")).toContainText("Calendar");
    // Switch back
    await page.click("button:has-text('UK')");
    await expect(page).toHaveURL(/\/uk\/calendar/, { timeout: 10_000 });
    await expect(page.locator("h1")).toContainText("Календар");
  });

  test("html lang attribute matches the locale", async ({ page }) => {
    await page.goto(`${BASE}/uk/calendar`);
    await expect(page.locator("html")).toHaveAttribute("lang", "uk");
    await page.goto(`${BASE}/en/calendar`);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});

test.describe("Theme toggle", () => {
  test("toggling theme flips html.dark class", async ({ page }) => {
    await page.goto(`${BASE}/uk/calendar`);
    const html = page.locator("html");
    const initial = await html.getAttribute("class");
    await page.click("button[aria-label='Переключити тему'], button[aria-label='Toggle theme']");
    await page.waitForTimeout(300);
    const after = await html.getAttribute("class");
    expect(after).not.toBe(initial);
    // Toggle back
    await page.click("button[aria-label='Переключити тему'], button[aria-label='Toggle theme']");
    await page.waitForTimeout(300);
    const back = await html.getAttribute("class");
    expect(back).toBe(initial);
  });
});

test.describe("Notifications bell", () => {
  test("bell is visible and opens dropdown", async ({ page }) => {
    await page.goto(`${BASE}/uk/calendar`);
    const bell = page.locator("button[aria-label='Сповіщення'], button[aria-label='Notifications']");
    await expect(bell).toBeVisible();
    await bell.click();
    await expect(page.locator("text=Сповіщення").first()).toBeVisible({ timeout: 3_000 });
  });

  test("empty state renders when no notifications", async ({ page }) => {
    await page.goto(`${BASE}/uk/calendar`);
    await page.click("button[aria-label='Сповіщення'], button[aria-label='Notifications']");
    // Either notifications exist OR the empty state shows
    const noNotifs = page.locator("text=Немає сповіщень");
    const list = page.locator("button[aria-label='Сповіщення'] + div button").first();
    await expect(noNotifs.or(list)).toBeVisible({ timeout: 5_000 });
  });
});
