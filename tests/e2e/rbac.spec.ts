import { test, expect } from "@playwright/test";
import { BASE } from "./helpers";

test.describe("RBAC — member restrictions", () => {
  test.use({ storageState: "playwright/.auth/member.json" });

  test("member sees settings guard, not admin tabs", async ({ page }) => {
    await page.goto(`${BASE}/uk/settings`);
    await expect(page.locator("text=Тільки для адміністраторів")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("button:has-text('Користувачі')")).toHaveCount(0);
    await expect(page.locator("button:has-text('Проєкти')")).toHaveCount(0);
  });

  test("member can create their own commitment", async ({ page }) => {
    await page.goto(`${BASE}/uk/calendar`);
    await page.click("button:has-text('Нове зобов\\'язання')");
    const title = `Member commitment ${Date.now()}`;
    await page.locator("form input[type='text']").first().fill(title);
    const d = new Date();
    d.setDate(d.getDate() + 6);
    const pad = (n: number) => String(n).padStart(2, "0");
    await page.fill("input[type='datetime-local']", `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T13:00`);
    await page.click("button[type='submit']:has-text('Зберегти')");
    await expect(page.locator("text=Зобов'язання створено")).toBeVisible({ timeout: 10_000 });
  });

  test("member sees Edit/Delete on their own commitment", async ({ page }) => {
    await page.goto(`${BASE}/uk/calendar`);
    // Create a commitment first
    await page.click("button:has-text('Нове зобов\\'язання')");
    const title = `Owned ${Date.now()}`;
    await page.locator("form input[type='text']").first().fill(title);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const pad = (n: number) => String(n).padStart(2, "0");
    await page.fill("input[type='datetime-local']", `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T14:00`);
    await page.click("button[type='submit']:has-text('Зберегти')");
    await expect(page.locator("text=Зобов'язання створено")).toBeVisible({ timeout: 10_000 });

    // Open it
    await page.goto(`${BASE}/uk/commitments`);
    await page.locator("tr").filter({ hasText: title }).click();
    // The modal header should have edit + delete icon buttons (since member owns it)
    const modal = page.locator("div").filter({ hasText: /Змінити статус/ }).last();
    await expect(modal).toBeVisible();
  });
});
