import { test, expect, type Browser } from "@playwright/test";
import { registerAndLogin, login, uniqueEmail, TEST_PASSWORD } from "./helpers";

const BASE = "http://localhost:3333";

// Shared email created once per test file via beforeAll
let sharedEmail: string;

async function setupUser(browser: Browser) {
  const email = uniqueEmail("app");
  const page = await browser.newPage();
  await registerAndLogin(page, email);
  await page.close();
  return email;
}

test.describe("App navigation and layout", () => {
  test.beforeAll(async ({ browser }) => {
    sharedEmail = await setupUser(browser);
  });

  test.beforeEach(async ({ page }) => {
    await login(page, sharedEmail);
  });

  test("sidebar is visible with nav links", async ({ page }) => {
    await expect(page.locator("nav")).toBeVisible();
    await expect(page.locator("nav a:has-text('Календар')")).toBeVisible();
    await expect(page.locator("nav a:has-text('Зобов\\'язання')")).toBeVisible();
    await expect(page.locator("nav a:has-text('Налаштування')")).toBeVisible();
  });

  test("header is visible", async ({ page }) => {
    await expect(page.locator("header")).toBeVisible();
  });

  test("navigate to commitments list page", async ({ page }) => {
    await page.click("nav a:has-text('Зобов\\'язання')");
    await expect(page).toHaveURL(/\/uk\/commitments/);
  });

  test("navigate to settings page (non-admin sees shield)", async ({ page }) => {
    await page.click("nav a:has-text('Налаштування')");
    await expect(page).toHaveURL(/\/uk\/settings/);
    await expect(page.locator("text=Тільки для адміністраторів")).toBeVisible({ timeout: 5000 });
  });

  test("calendar page has 'New commitment' button", async ({ page }) => {
    await expect(page.locator("button:has-text('Нове зобов\\'язання')")).toBeVisible();
  });

  test("language switcher toggles to English", async ({ page }) => {
    const enButton = page.locator("button:has-text('EN')");
    if (await enButton.count() > 0) {
      await enButton.click();
      await expect(page).toHaveURL(/\/en\/calendar/, { timeout: 5000 });
      // Switch back
      const ukButton = page.locator("button:has-text('UK')");
      await ukButton.click();
      await expect(page).toHaveURL(/\/uk\/calendar/, { timeout: 5000 });
    }
  });

  test("theme toggle is clickable and changes theme", async ({ page }) => {
    const html = page.locator("html");
    const initialClass = await html.getAttribute("class");

    // ThemeToggle has aria-label="Переключити тему"
    await page.click("button[aria-label='Переключити тему']");

    const newClass = await html.getAttribute("class");
    expect(newClass).not.toBe(initialClass);
  });
});

test.describe("Calendar page", () => {
  test.beforeAll(async ({ browser }) => {
    if (!sharedEmail) {
      sharedEmail = await setupUser(browser);
    }
  });

  test.beforeEach(async ({ page }) => {
    await login(page, sharedEmail);
  });

  test("calendar renders FullCalendar", async ({ page }) => {
    await expect(page.locator(".fc")).toBeVisible({ timeout: 10000 });
  });

  test("calendar is always visible (even when empty)", async ({ page }) => {
    // FullCalendar must be present regardless of commitment count
    await expect(page.locator(".fc")).toBeVisible({ timeout: 10000 });
    // The calendar toolbar with prev/next buttons
    await expect(page.locator(".fc-prev-button")).toBeVisible({ timeout: 5000 });
  });

  test("clicking 'New commitment' opens create modal", async ({ page }) => {
    await page.click("button:has-text('Нове зобов\\'язання')");
    // Modal form should appear with title input
    await expect(page.locator("input[type='text']").first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator("input[type='datetime-local']")).toBeVisible();
  });

  test("create commitment via modal", async ({ page }) => {
    await page.click("button:has-text('Нове зобов\\'язання')");

    const title = `Playwright test ${Date.now()}`;
    await page.fill("input[type='text']", title);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    const deadlineStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T12:00`;
    await page.fill("input[type='datetime-local']", deadlineStr);

    await page.click("button:has-text('Зберегти')");

    // Modal closes
    await expect(page.locator("input[type='datetime-local']")).not.toBeVisible({ timeout: 5000 });
    // Toast appears
    await expect(page.locator("text=Зобов'язання створено")).toBeVisible({ timeout: 5000 });
  });

  test("calendar filters render status pills", async ({ page }) => {
    await expect(page.locator("button:has-text('Очікує перевірки')")).toBeVisible();
    await expect(page.locator("button:has-text('Прострочено')")).toBeVisible();
    await expect(page.locator("button:has-text('Виконано')")).toBeVisible();
  });

  test("status filter pill activates and deactivates", async ({ page }) => {
    const pill = page.locator("button:has-text('Виконано')");
    // Activate
    await pill.click();
    await expect(pill).toHaveClass(/text-primary/, { timeout: 2000 });
    // Deactivate
    await pill.click();
    await expect(pill).toHaveClass(/text-muted-foreground/, { timeout: 2000 });
  });
});

test.describe("Commitments list page", () => {
  let commitmentTitle: string;

  test.beforeAll(async ({ browser }) => {
    if (!sharedEmail) {
      sharedEmail = await setupUser(browser);
    }
    // Create a commitment to test with
    const page = await browser.newPage();
    await login(page, sharedEmail);
    await page.click("button:has-text('Нове зобов\\'язання')");
    commitmentTitle = `List test ${Date.now()}`;
    await page.fill("input[type='text']", commitmentTitle);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, "0");
    await page.fill("input[type='datetime-local']", `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T10:00`);
    await page.click("button:has-text('Зберегти')");
    await page.waitForTimeout(1000);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await login(page, sharedEmail);
    await page.goto(`${BASE}/uk/commitments`);
  });

  test("commitments page renders with heading", async ({ page }) => {
    await expect(page.locator("h1")).toBeVisible();
  });

  test("created commitment appears in list", async ({ page }) => {
    await expect(page.locator(`text=${commitmentTitle}`)).toBeVisible({ timeout: 5000 });
  });

  test("clicking a commitment row opens view modal", async ({ page }) => {
    const row = page.locator(`text=${commitmentTitle}`);
    await row.click();
    await expect(page.locator("text=Змінити статус")).toBeVisible({ timeout: 3000 });
  });
});

test.describe("Logout", () => {
  test.beforeAll(async ({ browser }) => {
    if (!sharedEmail) {
      sharedEmail = await setupUser(browser);
    }
  });

  test("logout redirects to login page", async ({ page }) => {
    await login(page, sharedEmail);
    // Logout button has aria-label="Вийти" (icon button)
    await page.click("button[aria-label='Вийти']");
    await expect(page).toHaveURL(/\/uk\/login/, { timeout: 5000 });
  });
});
