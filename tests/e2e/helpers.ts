import { type Page, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export const BASE = process.env.BASE_URL ?? "http://localhost:3000";
export const TEST_PASSWORD = "TestPassword123!";

const AUTH_DIR = path.join(process.cwd(), "playwright/.auth");
const USERS_FILE = path.join(AUTH_DIR, "users.json");

export interface TestUser {
  name: string;
  email: string;
  password: string;
  role: "admin" | "member";
}

export interface PersistedUsers {
  admin: TestUser;
  member: TestUser;
}

export function readUsers(): PersistedUsers {
  if (!fs.existsSync(USERS_FILE)) {
    throw new Error(
      `Users file not found at ${USERS_FILE}. Did the setup project run?`,
    );
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8")) as PersistedUsers;
}

export function writeUsers(users: PersistedUsers) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@playwright.test`;
}

export async function gotoLogin(page: Page, locale: "uk" | "en" = "uk") {
  await page.goto(`${BASE}/${locale}/login`);
}

export async function gotoRegister(page: Page, locale: "uk" | "en" = "uk") {
  await page.goto(`${BASE}/${locale}/register`);
}

export async function register(
  page: Page,
  user: { name: string; email: string; password: string },
  locale: "uk" | "en" = "uk",
) {
  await gotoRegister(page, locale);
  await page.fill("input#name", user.name);
  await page.fill("input#email", user.email);
  await page.fill("input#password", user.password);
  await page.fill("input#confirmPassword", user.password);
  await Promise.all([
    page.waitForURL(new RegExp(`/${locale}/calendar`), { timeout: 30_000 }),
    page.click("button[type='submit']"),
  ]);
  await expect(page).toHaveURL(new RegExp(`/${locale}/calendar`));
}

export async function login(
  page: Page,
  email: string,
  password: string = TEST_PASSWORD,
  locale: "uk" | "en" = "uk",
) {
  await gotoLogin(page, locale);
  await page.fill("input[type='email']", email);
  await page.fill("input[type='password']", password);
  await Promise.all([
    page.waitForURL(new RegExp(`/${locale}/calendar`), { timeout: 30_000 }),
    page.click("button[type='submit']"),
  ]);
}

export async function logout(page: Page) {
  await page.click("button[aria-label='Вийти'], button[aria-label='Sign out'], button[aria-label='Log out']");
  await page.waitForURL(/\/(uk|en)\/login/, { timeout: 10_000 });
}

export async function ensureLoggedIn(
  page: Page,
  email: string,
  password: string = TEST_PASSWORD,
) {
  const url = page.url();
  if (!/\/(uk|en)\/(calendar|commitments|settings)/.test(url)) {
    await login(page, email, password);
  }
}
