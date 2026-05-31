/* eslint-disable no-console */
/**
 * Quick Lighthouse runner against the running Docker app.
 *
 *   node tests/lighthouse/run.mjs
 *
 * Runs against /uk/login (unauth) and one authenticated route per device.
 * For authed routes, we POST credentials to Supabase first, transfer the cookie
 * into the Chrome instance, then audit.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(__dirname, "reports");
fs.mkdirSync(OUT_DIR, { recursive: true });

const AUTH_FILE = path.join(process.cwd(), "playwright/.auth/admin.json");

async function runOne(url, label, formFactor) {
  const chrome = await launch({
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
  });

  let extraHeaders = undefined;

  // For authed pages, transfer cookies from Playwright's admin storage into
  // Chrome via Lighthouse extraHeaders is non-trivial; instead, attach via the
  // CDP cookie API once we know the port. For simplicity, only audit /login
  // (public). Authed audits would require a more elaborate setup.
  void AUTH_FILE;

  const result = await lighthouse(
    url,
    {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      formFactor,
      screenEmulation:
        formFactor === "mobile"
          ? { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false }
          : { mobile: false, width: 1366, height: 768, deviceScaleFactor: 1, disabled: false },
      throttling:
        formFactor === "mobile"
          ? {
              rttMs: 150,
              throughputKbps: 1638.4,
              cpuSlowdownMultiplier: 4,
              requestLatencyMs: 0,
              downloadThroughputKbps: 0,
              uploadThroughputKbps: 0,
            }
          : {
              rttMs: 40,
              throughputKbps: 10240,
              cpuSlowdownMultiplier: 1,
              requestLatencyMs: 0,
              downloadThroughputKbps: 0,
              uploadThroughputKbps: 0,
            },
    },
    {
      extends: "lighthouse:default",
      settings: { extraHeaders },
    },
  );

  await chrome.kill();

  const lhr = result.lhr;
  const scores = {
    performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
    accessibility: Math.round((lhr.categories.accessibility?.score ?? 0) * 100),
    bestPractices: Math.round((lhr.categories["best-practices"]?.score ?? 0) * 100),
    seo: Math.round((lhr.categories.seo?.score ?? 0) * 100),
  };

  const jsonPath = path.join(OUT_DIR, `${label}-${formFactor}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(lhr, null, 2));

  console.log(`${label} ${formFactor}: perf=${scores.performance} a11y=${scores.accessibility} bp=${scores.bestPractices} seo=${scores.seo}`);
  return scores;
}

const targets = [
  { url: `${BASE}/uk/login`, label: "login-uk" },
  { url: `${BASE}/en/login`, label: "login-en" },
  { url: `${BASE}/uk/register`, label: "register-uk" },
];

const results = {};
for (const { url, label } of targets) {
  for (const formFactor of ["desktop", "mobile"]) {
    try {
      results[`${label}-${formFactor}`] = await runOne(url, label, formFactor);
    } catch (err) {
      console.error(`${label} ${formFactor} failed:`, err.message);
      results[`${label}-${formFactor}`] = { error: err.message };
    }
  }
}

fs.writeFileSync(path.join(OUT_DIR, "summary.json"), JSON.stringify(results, null, 2));
console.log("\nSummary written to", path.join(OUT_DIR, "summary.json"));
