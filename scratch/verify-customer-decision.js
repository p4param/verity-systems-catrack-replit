const { chromium } = require('playwright-core');

const QUOTATION_ID = '20b7afb2-da95-4473-9ffa-201329d22d6b';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
  const failed = [];
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(`${res.status()} ${res.request().method()} ${res.url()}`);
  });

  try {
    await page.goto('http://localhost:5000/login', { waitUntil: 'load', timeout: 90000 });
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(1000);
    await emailInput.fill('admin@verity.com');
    await page.locator('input[type="password"], input[name="password"]').fill('Admin@123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60000 });
    await page.waitForTimeout(1000);
    failed.length = 0;

    await page.goto(`http://localhost:5000/cat/quotations/${QUOTATION_ID}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Loading Quotation Workspace...', { state: 'detached', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const decisionTab = page.locator('button:has-text("Customer Decision")').first();
    await decisionTab.waitFor({ state: 'visible', timeout: 30000 });
    await decisionTab.click();
    await page.waitForSelector('text=Loading Customer Decision...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scratch/decision1-workspace.png', fullPage: true });

    // Select "Accepted with Conditions" and add notes.
    await page.click('button:has-text("Accepted with Conditions")');
    await page.fill('textarea[placeholder*="Record what the customer said"]', 'Customer wants menu tasting before final confirmation.');
    await page.click('button:has-text("Record Decision")');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'scratch/decision2-after-record.png', fullPage: true });

    // Record a second decision to prove history is append-only (both entries visible).
    await page.click('button:has-text("Accepted"):not(:has-text("Conditions"))');
    await page.fill('textarea[placeholder*="Record what the customer said"]', 'Confirmed after tasting — proceeding.');
    await page.click('button:has-text("Record Decision")');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'scratch/decision3-second-record.png', fullPage: true });

    console.log('Failed requests:', JSON.stringify(failed, null, 2));
    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
    await page.screenshot({ path: 'scratch/decision-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
