import { type Page } from "@playwright/test";

const BASE = "http://localhost:3333";

export const TEST_PASSWORD = "testpassword123";
export const TEST_NAME = "Playwright User";

export function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}@playwright.test`;
}

export async function registerAndLogin(page: Page, email: string) {
  await page.goto(`${BASE}/uk/register`);
  await page.fill("input#name", TEST_NAME);
  await page.fill("input#email", email);
  await page.fill("input#password", TEST_PASSWORD);
  await page.fill("input#confirmPassword", TEST_PASSWORD);
  await page.click("button[type='submit']");
  await page.waitForURL(/\/uk\/calendar/, { timeout: 15000 });
}

export async function login(page: Page, email: string) {
  await page.goto(`${BASE}/uk/login`);
  await page.fill("input[type='email']", email);
  await page.fill("input[type='password']", TEST_PASSWORD);
  await page.click("button[type='submit']");
  await page.waitForURL(/\/uk\/calendar/, { timeout: 15000 });
}
