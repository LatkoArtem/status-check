import { test, expect } from "@playwright/test";
import { BASE } from "./helpers";

test.use({ storageState: "playwright/.auth/admin.json" });

test.describe("Commitments list page", () => {
  const sharedTitle = `E2E List ${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    // Seed at least one commitment so list isn't empty.
    const ctx = await browser.newContext({ storageState: "playwright/.auth/admin.json" });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/uk/calendar`);
    await page.click("button:has-text('Нове зобов\\'язання')");
    await page.locator("form input[type='text']").first().fill(sharedTitle);
    const d = new Date();
    d.setDate(d.getDate() + 5);
    const pad = (n: number) => String(n).padStart(2, "0");
    await page.fill("input[type='datetime-local']", `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:30`);
    await page.click("button[type='submit']:has-text('Зберегти')");
    await expect(page.locator("text=Зобов'язання створено")).toBeVisible({ timeout: 10_000 });
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/uk/commitments`);
  });

  test("page renders with heading", async ({ page }) => {
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toContainText(/Зобов/);
  });

  test("table shows our seeded commitment", async ({ page }) => {
    await expect(page.locator(`text=${sharedTitle}`)).toBeVisible({ timeout: 10_000 });
  });

  test("status badge renders on row", async ({ page }) => {
    const row = page.locator("tr").filter({ hasText: sharedTitle });
    await expect(row).toBeVisible();
    await expect(row.locator("span:has-text('Очікує перевірки')")).toBeVisible();
  });

  test("clicking a row opens view modal", async ({ page }) => {
    await page.locator("tr").filter({ hasText: sharedTitle }).click();
    await expect(page.locator("text=Змінити статус")).toBeVisible({ timeout: 5_000 });
  });

  test("filter pill restricts list", async ({ page }) => {
    await expect(page.locator(`text=${sharedTitle}`)).toBeVisible({ timeout: 10_000 });
    // Toggle "Виконано" — our commitment is to_check so it should disappear
    await page.click("button:has-text('Виконано')");
    await expect(page.locator(`text=${sharedTitle}`)).toHaveCount(0);
    await page.click("button:has-text('Очистити фільтри')");
    await expect(page.locator(`text=${sharedTitle}`)).toBeVisible();
  });
});
