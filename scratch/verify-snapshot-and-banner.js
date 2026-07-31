const { chromium } = require('playwright-core');

const QUOTATION_ID = '20b7afb2-da95-4473-9ffa-201329d22d6b';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

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

    await page.goto(`http://localhost:5000/cat/quotations/${QUOTATION_ID}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await page.waitForSelector('text=Loading Quotation Workspace...', { state: 'detached', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const revisionsTab = page.locator('button:has-text("Revisions")').first();
    await revisionsTab.waitFor({ state: 'visible', timeout: 30000 });
    await revisionsTab.click();
    await page.waitForSelector('text=Loading Revision Management...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Banner + Working Draft panel.
    await page.screenshot({ path: 'scratch/final1-banner-workingdraft.png', fullPage: true });

    // Snapshot Viewer.
    const firstView = page.locator('button:has-text("View Snapshot")').first();
    await firstView.waitFor({ state: 'visible', timeout: 15000 });
    await firstView.click();
    await page.waitForSelector('text=Loading snapshot...', { state: 'detached', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'scratch/final2-snapshot-header.png' });

    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
  } finally {
    await browser.close();
  }
})();
