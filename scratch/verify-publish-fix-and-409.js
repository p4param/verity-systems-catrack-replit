const { chromium } = require('playwright-core');

const QUOTATION_ID = '20b7afb2-da95-4473-9ffa-201329d22d6b';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

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

    // 1. Duplicate-protection 409 — this quotation is already converted.
    const convertResult = await page.evaluate(async (id) => {
      const res = await fetch(`/api/cat/quotations/${id}/convert`, { method: 'POST' });
      const body = await res.json();
      return { status: res.status, body };
    }, QUOTATION_ID);
    console.log('POST /convert on already-converted quotation:', JSON.stringify(convertResult, null, 2));

    // 2. Publish dialog fix — verify confirm -> success transition stays open.
    await page.goto(`http://localhost:5000/cat/quotations/${QUOTATION_ID}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Loading Quotation Workspace...', { state: 'detached', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Proposal Review")');
    await page.waitForSelector('text=Loading Proposal Review...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    await page.click('button:has-text("Publish Proposal")');
    await page.waitForTimeout(500);
    await page.locator('[role="alertdialog"] button:has-text("Publish Proposal")').click();
    await page.waitForTimeout(1200);
    const dialogCount = await page.locator('[role="alertdialog"]').count();
    console.log('Publish dialog present after confirm+wait (should be 1, showing success):', dialogCount);
    await page.screenshot({ path: 'scratch/publishfix1.png' });

    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
    await page.screenshot({ path: 'scratch/publishfix-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
