import { chromium } from 'playwright-core';
import path from 'path';

const BASE = 'http://localhost:5000';
const SHOT_DIR = path.join(__dirname, 'emwp10a-screenshots');

async function shot(page: any, name: string) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: true });
  console.log(`[screenshot] ${name}`);
}

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on('console', (msg: any) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err: any) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on('response', (res: any) => {
    if (res.status() >= 400 && !res.url().includes('/api/auth/refresh')) console.log(`[HTTP ${res.status()}] ${res.url()}`);
  });

  try {
    await runFlow(page);
  } catch (err) {
    console.error('FLOW FAILED, capturing diagnostic screenshot:', err);
    await shot(page, 'ERROR-state');
    console.log('URL at failure:', page.url());
    throw err;
  } finally {
    console.log('Console errors collected:', consoleErrors);
    await browser.close();
  }
}

async function runFlow(page: any) {
  console.log('--- Login ---');
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email', { state: 'visible' });
  const emailInput = page.locator('#email');
  const passwordInput = page.locator('#password');
  await emailInput.click();
  await emailInput.type('admin@verity.com', { delay: 20 });
  await passwordInput.click();
  await passwordInput.type('Admin@123', { delay: 20 });
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((url: URL) => !url.pathname.includes('/login'), { timeout: 25000, waitUntil: 'domcontentloaded' });
  console.log('Logged in, URL:', page.url());

  console.log('--- Check sidebar nav entry ---');
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const navLink = page.locator('a:has-text("Production Center")').first();
  const navVisible = await navLink.isVisible().catch(() => false);
  console.log('Production Center nav link visible:', navVisible);
  await shot(page, '01-sidebar-nav');

  console.log('--- Navigate to Production Center ---');
  if (navVisible) {
    await navLink.click();
  } else {
    await page.goto(`${BASE}/cat/production-center`, { waitUntil: 'domcontentloaded' });
  }
  await page.waitForTimeout(1000);
  await shot(page, '02-default-today');

  console.log('--- Set Work Date to the shared demo date ---');
  const dateInput = page.locator('input[type="date"]');
  await dateInput.fill('2026-11-14');
  await page.waitForFunction(() => !document.body.innerText.includes('Loading Production Center'), { timeout: 20000 }).catch(() => {
    console.log('Loading indicator did not clear within 20s.');
  });
  await page.waitForTimeout(800);
  await shot(page, '03-shared-work-date');

  const bodyText = await page.locator('body').innerText();
  const eventsKpiMatch = bodyText.match(/(\d+)\s*\n\s*Events/);
  console.log('Events KPI text snippet found:', eventsKpiMatch ? eventsKpiMatch[0].replace(/\n/g, ' ') : 'NOT FOUND');

  console.log('--- Expand first ingredient row ---');
  const ingredientRows = page.locator('div.border.border-border\\/40.rounded-xl.overflow-hidden button');
  const firstIngredientButton = ingredientRows.first();
  const hasIngredientRow = await firstIngredientButton.isVisible().catch(() => false);
  console.log('Has at least one ingredient row:', hasIngredientRow);
  if (hasIngredientRow) {
    await firstIngredientButton.click();
    await page.waitForTimeout(600);
    await shot(page, '04-ingredient-expanded-events');

    const eventSubRow = page.locator('.bg-card.border.border-border\\/30 button').first();
    if (await eventSubRow.isVisible().catch(() => false)) {
      await eventSubRow.click();
      await page.waitForTimeout(500);
      await shot(page, '05-event-expanded-meals');

      const mealSubRow = page.locator('.bg-muted\\/10.border.border-border\\/20 button').first();
      if (await mealSubRow.isVisible().catch(() => false)) {
        await mealSubRow.click();
        await page.waitForTimeout(500);
        await shot(page, '06-meal-expanded-recipes');
      }
    }
  }

  console.log('--- Search ingredient ---');
  const searchInput = page.locator('input[placeholder="Search ingredient..."]');
  await searchInput.fill('Paneer');
  await page.waitForTimeout(500);
  await shot(page, '07-search-filtered');
  await searchInput.fill('');

  console.log('--- Expand Exceptions panel ---');
  const exceptionsToggle = page.locator('button:has-text("Exceptions (")').first();
  await exceptionsToggle.click();
  await page.waitForTimeout(500);
  await shot(page, '08-exceptions-expanded');

  console.log('--- Event Summary row click -> Event Workspace ---');
  const firstEventRow = page.locator('table tbody tr').first();
  await firstEventRow.waitFor({ state: 'visible', timeout: 5000 });
  const eventRowText = await firstEventRow.textContent();
  console.log('Clicking event row:', eventRowText?.slice(0, 80));
  await firstEventRow.click();
  await page.waitForURL(/\/cat\/events\/[^/]+$/, { timeout: 10000 });
  console.log('Navigated to Event Workspace URL:', page.url());
  await shot(page, '09-event-workspace-opened');
}

main().catch((err) => {
  console.error('SMOKE TEST FAILED:', err);
  process.exit(1);
});
