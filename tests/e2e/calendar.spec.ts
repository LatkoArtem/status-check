import { test, expect } from "@playwright/test";
import { BASE, readUsers } from "./helpers";

test.use({ storageState: "playwright/.auth/admin.json" });

test.describe("Calendar page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/uk/calendar`);
    await expect(page).toHaveURL(/\/uk\/calendar/);
  });

  test("FullCalendar renders with toolbar", async ({ page }) => {
    await expect(page.locator(".fc")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".fc-prev-button")).toBeVisible();
    await expect(page.locator(".fc-next-button")).toBeVisible();
  });

  test("status filter pills render and toggle", async ({ page }) => {
    const pill = page.locator("button:has-text('Виконано')");
    await expect(pill).toBeVisible();
    await pill.click();
    await expect(pill).toHaveClass(/text-primary|bg-primary/);
    await pill.click();
    await expect(pill).not.toHaveClass(/bg-primary\/10/);
  });

  test("Clear filters appears only when filter active", async ({ page }) => {
    const clearBtn = page.locator("button:has-text('Очистити фільтри')");
    await expect(clearBtn).toHaveCount(0);
    await page.click("button:has-text('Виконано')");
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(clearBtn).toHaveCount(0);
  });

  test("New-commitment button opens modal with form", async ({ page }) => {
    await page.click("button:has-text('Нове зобов\\'язання')");
    await expect(page.locator("input[type='datetime-local']")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Скасувати")).toBeVisible();
    await expect(page.locator("text=Зберегти")).toBeVisible();
  });

  test("Create commitment → toast → appears on calendar", async ({ page }) => {
    await page.click("button:has-text('Нове зобов\\'язання')");
    const title = `E2E Calendar ${Date.now()}`;
    await page.locator("form input[type='text']").first().fill(title);
    // Use today's date so listWeek always contains the event regardless of
    // which weekday "today" lands on.
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const deadline = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:30`;
    await page.fill("input[type='datetime-local']", deadline);
    await page.click("button[type='submit']:has-text('Зберегти')");
    await expect(page.locator("text=Зобов'язання створено")).toBeVisible({ timeout: 10_000 });

    // Switch to list view — events on a busy day in month view get folded
    // behind a "+more" pill.
    await page.click(".fc-listWeek-button");
    await expect(
      page.locator(".fc-list-event").filter({ hasText: title }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("Click on event opens view modal with status change", async ({ page }) => {
    await page.click("button:has-text('Нове зобов\\'язання')");
    const title = `E2E ViewOpen ${Date.now()}`;
    await page.locator("form input[type='text']").first().fill(title);
    // Today's date keeps the event inside `listWeek` regardless of weekday.
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    await page.fill(
      "input[type='datetime-local']",
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T19:00`,
    );
    await page.click("button[type='submit']:has-text('Зберегти')");
    await expect(page.locator("text=Зобов'язання створено")).toBeVisible({
      timeout: 10_000,
    });

    await page.click(".fc-listWeek-button");
    await page.locator(".fc-list").waitFor({ timeout: 5_000 });

    await page
      .locator(".fc-list-event")
      .filter({ hasText: title })
      .first()
      .click({ timeout: 10_000 });
    await expect(page.locator("text=Змінити статус")).toBeVisible({ timeout: 5_000 });
  });

  test("Validation: empty title shows error", async ({ page }) => {
    await page.click("button:has-text('Нове зобов\\'язання')");
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    await page.fill("input[type='datetime-local']", `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T12:00`);
    await page.click("button[type='submit']:has-text('Зберегти')");
    await expect(page.locator("text=Заголовок обов'язковий")).toBeVisible();
  });

  test("Modal closes on Escape", async ({ page }) => {
    await page.click("button:has-text('Нове зобов\\'язання')");
    await expect(page.locator("input[type='datetime-local']")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("input[type='datetime-local']")).toBeHidden({ timeout: 3_000 });
  });
});
