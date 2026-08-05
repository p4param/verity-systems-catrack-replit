import { chromium } from 'playwright-core';
import path from 'path';

const BASE = 'http://localhost:5000';
const SHOT_DIR = path.join(__dirname, 'emwp10-screenshots');

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

  console.log('--- Navigate to Events list ---');
  await page.goto(`${BASE}/cat/events`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading Event Directory'), { timeout: 15000 });
  await page.waitForTimeout(500);

  // Open the same event used for EM-WP09 verification (EVT-2026-000011).
  const eventRow = page.locator('text=EVT-2026-000011').first();
  await eventRow.waitFor({ state: 'visible', timeout: 10000 });
  await eventRow.click();
  await page.waitForURL(/\/cat\/events\/[^/]+$/, { timeout: 10000 });
  await page.waitForTimeout(1000);

  console.log('--- Open Ingredient Demand tab ---');
  await page.locator('button:has-text("Ingredient Demand")').first().click();
  // First hit to this brand-new API route triggers Next dev-mode
  // on-demand compilation — wait for the loading text to clear rather
  // than a fixed timeout.
  await page.waitForFunction(() => !document.body.innerText.includes('Loading Ingredient Demand'), { timeout: 20000 }).catch(() => {
    console.log('Loading indicator did not clear within 20s.');
  });
  await page.waitForTimeout(500);
  await shot(page, '01-ingredient-demand-overview');

  const kpiUnique = await page.locator('text=Unique Ingredients').count();
  const kpiMeal = await page.locator('text=Meal Groups').count();
  const kpiRecipe = await page.locator('text=Recipe Contributions').count();
  const kpiExcluded = await page.locator('text=Excluded Items').count();
  console.log('KPI labels found:', { kpiUnique, kpiMeal, kpiRecipe, kpiExcluded });

  console.log('--- Find Paneer row and expand ---');
  const paneerRow = page.locator('button', { hasText: 'Paneer' }).first();
  const paneerVisible = await paneerRow.isVisible().catch(() => false);
  console.log('Paneer row visible:', paneerVisible);
  if (paneerVisible) {
    const rowText = await paneerRow.textContent();
    console.log('Paneer row text:', rowText);
    await paneerRow.click();
    await page.waitForTimeout(800);
    await shot(page, '02-paneer-expanded');

    const mealButton = page.locator('button:has-text("Cocktail Hour")').first();
    const mealVisible = await mealButton.isVisible().catch(() => false);
    console.log('Cocktail Hour meal subtotal row visible:', mealVisible);
    if (mealVisible) {
      const mealText = await mealButton.textContent();
      console.log('Meal subtotal row text:', mealText);
      await mealButton.click();
      await page.waitForTimeout(600);
      await shot(page, '03-meal-expanded-contributions');
      const bodyText = await page.locator('body').innerText();
      const hasJainContribution = bodyText.includes('Jain');
      console.log('Jain contribution visible in expanded row:', hasJainContribution);
    }
  }

  console.log('--- Check Excluded Items panel ---');
  const excludedToggle = page.locator('button:has-text("Excluded Items")').first();
  if (await excludedToggle.count() > 0) {
    await excludedToggle.click();
    await page.waitForTimeout(600);
    await shot(page, '04-excluded-items-expanded');
  }
}

main().catch((err) => {
  console.error('SMOKE TEST FAILED:', err);
  process.exit(1);
});
