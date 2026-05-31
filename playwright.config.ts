import { defineConfig, devices } from "@playwright/test";

/**
 * Status Check — Playwright config
 *
 * Targets the Docker Compose app on http://localhost:3000.
 *
 * Projects are split across three browsers (chromium, firefox, webkit) and
 * three viewports (desktop, tablet, mobile) so the same suite runs cross-browser
 * and cross-device. Each project also depends on `setup` which registers two
 * fresh users via the UI (first = admin, second = member) and persists their
 * authenticated sessions to storage state for downstream tests.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

const DESKTOP = { width: 1280, height: 720 };
const TABLET = { width: 834, height: 1112 };
const MOBILE = { width: 390, height: 844 };

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // ---------- Setup ---------------------------------------------------
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: DESKTOP },
    },

    // ---------- Chromium desktop ---------------------------------------
    {
      name: "chromium-desktop",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], viewport: DESKTOP },
    },

    // ---------- Firefox desktop ----------------------------------------
    {
      name: "firefox-desktop",
      dependencies: ["setup"],
      use: { ...devices["Desktop Firefox"], viewport: DESKTOP },
    },

    // ---------- WebKit desktop -----------------------------------------
    {
      name: "webkit-desktop",
      dependencies: ["setup"],
      use: { ...devices["Desktop Safari"], viewport: DESKTOP },
    },

    // ---------- Tablet (chromium) --------------------------------------
    {
      name: "chromium-tablet",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], viewport: TABLET },
    },

    // ---------- Mobile (chromium) --------------------------------------
    {
      name: "chromium-mobile",
      dependencies: ["setup"],
      use: { ...devices["Pixel 5"], viewport: MOBILE },
    },
  ],
});
