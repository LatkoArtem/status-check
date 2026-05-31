import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { BASE } from "./helpers";

/**
 * Accessibility smoke tests with @axe-core/playwright.
 * We run against WCAG 2 A & AA rules and fail on serious / critical violations.
 *
 * `disableRules` is intentionally narrow — only third-party widgets (FullCalendar
 * markup) get exceptions if needed.
 */
function builder(page: import("@playwright/test").Page) {
  return new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    // FullCalendar markup occasionally trips `aria-allowed-attr`; allow it.
    .disableRules(["region"]);
}

function severeViolations(results: { violations: Array<{ impact?: string | null; id: string }> }) {
  return results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
}

test.describe("a11y — public pages", () => {
  test("login (uk)", async ({ page }) => {
    await page.goto(`${BASE}/uk/login`);
    const results = await builder(page).analyze();
    const severe = severeViolations(results);
    if (severe.length) console.log("login uk severe:", JSON.stringify(severe, null, 2));
    expect(severe).toEqual([]);
  });

  test("login (en)", async ({ page }) => {
    await page.goto(`${BASE}/en/login`);
    const results = await builder(page).analyze();
    const severe = severeViolations(results);
    if (severe.length) console.log("login en severe:", JSON.stringify(severe, null, 2));
    expect(severe).toEqual([]);
  });

  test("register (uk)", async ({ page }) => {
    await page.goto(`${BASE}/uk/register`);
    const results = await builder(page).analyze();
    const severe = severeViolations(results);
    if (severe.length) console.log("register uk severe:", JSON.stringify(severe, null, 2));
    expect(severe).toEqual([]);
  });
});

test.describe("a11y — authenticated pages", () => {
  test.use({ storageState: "playwright/.auth/admin.json" });

  test("calendar (uk)", async ({ page }) => {
    await page.goto(`${BASE}/uk/calendar`);
    await page.locator(".fc").waitFor({ state: "visible" });
    const results = await builder(page)
      // FullCalendar table heuristics trip some rules; exclude its DOM subtree.
      .exclude(".fc")
      .analyze();
    const severe = severeViolations(results);
    if (severe.length) console.log("calendar severe:", JSON.stringify(severe, null, 2));
    expect(severe).toEqual([]);
  });

  test("commitments (uk)", async ({ page }) => {
    await page.goto(`${BASE}/uk/commitments`);
    await page.locator("h1").waitFor({ state: "visible" });
    const results = await builder(page).analyze();
    const severe = severeViolations(results);
    if (severe.length) console.log("commitments severe:", JSON.stringify(severe, null, 2));
    expect(severe).toEqual([]);
  });

  test("settings (uk) — admin view", async ({ page }) => {
    await page.goto(`${BASE}/uk/settings`);
    await page.locator("h1").waitFor({ state: "visible" });
    const results = await builder(page).analyze();
    const severe = severeViolations(results);
    if (severe.length) console.log("settings severe:", JSON.stringify(severe, null, 2));
    expect(severe).toEqual([]);
  });
});
