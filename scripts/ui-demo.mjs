/**
 * Headed UI walkthrough — browser opens on your machine so you can watch.
 * Run: node scripts/ui-demo.mjs
 */
import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const SLOW = 900;

async function pause(page, ms = 1200) {
  await page.waitForTimeout(ms);
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`);
  await pause(page);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await pause(page, 600);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");
  await pause(page, 1500);
}

async function logout(page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${BASE}/login`);
  await pause(page);
}

async function run() {
  console.log("Opening browser — watch the demo on your screen…");
  const browser = await chromium.launch({
    headless: false,
    slowMo: SLOW,
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  try {
    // 1. Home + search (public)
    console.log("1/5 Public: home + search doctors");
    await page.goto(BASE);
    await pause(page);
    await page.goto(`${BASE}/search-doctors`);
    await pause(page, 2000);

    // 2. Admin — work shifts
    console.log("2/5 Admin: work shifts");
    await login(page, "admin@orcaxcare.com", "Admin@123");
    await page.goto(`${BASE}/admin/work-shifts`);
    await pause(page, 2000);
    await page.goto(`${BASE}/admin/appointment-slots/generate`);
    await pause(page, 2000);

    // 3. Doctor — schedule
    console.log("3/5 Doctor: schedule calendar");
    await logout(page);
    await login(page, "doctor.an@orcaxcare.com", "Doctor@123");
    await page.goto(`${BASE}/doctor/schedule`);
    await pause(page, 2500);
    await page.goto(`${BASE}/doctor/work-shifts`);
    await pause(page, 1500);

    // 4. Patient — wallet (PayOS mock) + insurance
    console.log("4/5 Patient: wallet + insurance");
    await logout(page);
    await login(page, "patient@orcaxcare.com", "Patient@123");
    await page.goto(`${BASE}/patient`);
    await pause(page, 1500);
    await page.goto(`${BASE}/patient/wallet`);
    await page.waitForSelector("select");
    await pause(page, 1500);
    await page.selectOption("select", "payos");
    await page.locator('input[type="number"]').fill("100000");
    await pause(page, 800);
    await Promise.all([
      page.waitForURL(/\/patient\/wallet\/payos\/mock/, { timeout: 30000 }),
      page.getByRole("button", { name: /Continue to PayOS/i }).click(),
    ]);
    await pause(page, 1500);
    await Promise.all([
      page.waitForURL(/payment=success/, { timeout: 30000 }),
      page.getByRole("button", { name: /Simulate successful payment/i }).click(),
    ]);
    await pause(page, 2000);

    await page.goto(`${BASE}/patient/insurance-cards`);
    await pause(page, 2000);

    // 5. Done
    console.log("5/5 Demo complete — browser stays open 8s");
    await pause(page, 8000);
  } catch (err) {
    console.error("Demo stopped:", err.message);
    await pause(page, 5000);
  } finally {
    await browser.close();
  }
}

run();
