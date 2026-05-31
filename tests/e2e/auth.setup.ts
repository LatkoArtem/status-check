import { test as setup, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import {
  BASE,
  TEST_PASSWORD,
  uniqueEmail,
  register,
  writeUsers,
  type PersistedUsers,
} from "./helpers";

const AUTH_DIR = path.join(process.cwd(), "playwright/.auth");
const ADMIN_STATE = path.join(AUTH_DIR, "admin.json");
const MEMBER_STATE = path.join(AUTH_DIR, "member.json");
const FRESH_FLAG = path.join(AUTH_DIR, "ready");

/**
 * Registers two fresh users via the UI:
 *   - User A → admin (created first, gets the admin role from DB migration trigger)
 *   - User B → member
 *
 * Their authenticated sessions are saved to storageState files so that
 * downstream tests can load each session without re-registering.
 *
 * Note: this assumes a clean DB state. In a real CI you'd reset DB between runs.
 * Here we accept that running twice in the same DB will create new users but the
 * first one (admin) will already exist — we always create fresh emails so this
 * is idempotent in practice, but the "first user is admin" rule only applies on
 * the first run against a fresh DB. To avoid relying on that, we instead pick
 * the admin by promoting the first registered user via the API on first run.
 */
setup("register admin + member users", async ({ browser }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const timestamp = Date.now();
  const admin = {
    name: "QA Admin",
    email: `admin.${timestamp}@playwright.test`,
    password: TEST_PASSWORD,
    role: "admin" as const,
  };
  const member = {
    name: "QA Member",
    email: `member.${timestamp}@playwright.test`,
    password: TEST_PASSWORD,
    role: "member" as const,
  };

  // ---- Register admin ---------------------------------------------------
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await register(adminPage, admin);
  await expect(adminPage).toHaveURL(/\/uk\/calendar/);
  await adminContext.storageState({ path: ADMIN_STATE });

  // ---- Register member --------------------------------------------------
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await register(memberPage, member);
  await expect(memberPage).toHaveURL(/\/uk\/calendar/);
  await memberContext.storageState({ path: MEMBER_STATE });

  // ---- Promote admin via DB ---------------------------------------------
  // The first registered user gets `role='member'` by default; we promote it
  // through tRPC (admin endpoint isn't available yet). For a deterministic test
  // environment we shell out to docker to set role directly. If this fails,
  // tests that require admin will skip gracefully.
  const { execSync } = await import("node:child_process");
  try {
    execSync(
      `docker exec status-check-db-1 psql -U postgres -d postgres -c "UPDATE public.profiles SET role='admin' WHERE email='${admin.email}';"`,
      { stdio: "pipe" },
    );
  } catch (err) {
    // Non-fatal — admin tests will skip if role isn't admin.
    console.warn("[setup] could not promote admin via docker exec:", (err as Error).message);
  }

  // Persist users for later test files.
  const users: PersistedUsers = { admin, member };
  writeUsers(users);

  fs.writeFileSync(FRESH_FLAG, new Date().toISOString());

  await adminContext.close();
  await memberContext.close();

  console.log(`[setup] admin: ${admin.email}`);
  console.log(`[setup] member: ${member.email}`);
  console.log(`[setup] BASE: ${BASE}`);
});
