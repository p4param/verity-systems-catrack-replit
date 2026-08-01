const { chromium } = require('playwright-core');

const QUOTATION_ID = '20b7afb2-da95-4473-9ffa-201329d22d6b';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
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
    await page.click('button:has-text("Event Conversion")');
    await page.waitForSelector('text=Loading Event Conversion...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Quotation is already converted (from the prior test run) — a fresh
    // load should go straight to the permanent audit view, no dialog.
    await page.screenshot({ path: 'scratch/evtfull1-audit-view.png', fullPage: true });

    // Reload — must STAY on the audit view (never the conversion form again).
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Loading Quotation Workspace...', { state: 'detached', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Event Conversion")');
    await page.waitForSelector('text=Loading Event Conversion...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scratch/evtfull2-audit-view-after-reload.png', fullPage: true });

    const convertButtonStillPresent = await page.locator('button:has-text("Convert to Event")').count();
    console.log('Convert to Event button present after reload (should be 0):', convertButtonStillPresent);

    // Open Event.
    await page.click('button:has-text("Open Event")');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'scratch/evtfull3-open-event-page.png', fullPage: true });
    console.log('URL after Open Event:', page.url());

    console.log('Failed requests:', JSON.stringify(failed, null, 2));
    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
    await page.screenshot({ path: 'scratch/evtfull-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
