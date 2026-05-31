import { test, expect } from "@playwright/test";
import { BASE } from "./helpers";

test.describe("Settings — admin", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/uk/settings`);
  });

  test("admin sees Users + Projects tabs", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Налаштування");
    await expect(page.locator("button:has-text('Користувачі')")).toBeVisible();
    await expect(page.locator("button:has-text('Проєкти')")).toBeVisible();
  });

  test("users table renders with current admin marked", async ({ page }) => {
    await expect(page.locator("table")).toBeVisible();
    // "You" or "Ви" badge identifies the current row
    await expect(page.locator("span", { hasText: /^(You|Ви)$/ }).first()).toBeVisible({ timeout: 5_000 });
  });

  test("admin can switch to projects tab and create a project", async ({ page }) => {
    await page.click("button:has-text('Проєкти')");
    const projectName = `E2E Proj ${Date.now()}`;
    await page.click("button:has-text('Новий проєкт')");
    await page.locator("input[type='text']").first().fill(projectName);
    await page.click("button:has-text('Зберегти')");
    await expect(page.locator("text=Проєкт створено")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator(`text=${projectName}`)).toBeVisible();
  });

  test("admin can edit a project", async ({ page }) => {
    await page.click("button:has-text('Проєкти')");
    // Create one first
    const orig = `E2E Edit ${Date.now()}`;
    await page.click("button:has-text('Новий проєкт')");
    await page.locator("#project-name").fill(orig);
    await page.click("button:has-text('Зберегти')");
    await expect(page.locator(`text=${orig}`)).toBeVisible({ timeout: 5_000 });

    // Edit — use the localized aria-label we put on the icon button
    await page.locator(`button[aria-label="Редагувати ${orig}"]`).click();
    const renamed = orig + " (edited)";
    await page.locator("#project-name").fill(renamed);
    await page.click("button:has-text('Зберегти')");
    await expect(page.locator("text=Проєкт оновлено")).toBeVisible({ timeout: 5_000 });
    await expect(page.locator(`text=${renamed}`)).toBeVisible();
  });

  test("admin can change another user's role", async ({ page }) => {
    // Role selects are scoped by their aria-label.
    const select = page.locator("select[aria-label='Змінити роль']").first();
    await expect(select).toBeVisible({ timeout: 10_000 });
    const original = await select.inputValue();
    const next = original === "admin" ? "member" : "admin";
    await select.selectOption(next);
    await expect(page.locator("text=Змінити роль")).toBeVisible({ timeout: 5_000 });
    // Revert to keep test fixtures stable
    await page.locator("select[aria-label='Змінити роль']").first().selectOption(original);
  });
});

test.describe("Settings — member RBAC guard", () => {
  test.use({ storageState: "playwright/.auth/member.json" });

  test("member sees admin-only guard", async ({ page }) => {
    await page.goto(`${BASE}/uk/settings`);
    await expect(page.locator("text=Тільки для адміністраторів")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("button:has-text('Користувачі')")).toHaveCount(0);
  });
});
