const { chromium } = require('playwright-core');

const QUOTATION_ID = '20b7afb2-da95-4473-9ffa-201329d22d6b';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

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

    await page.goto(`http://localhost:5000/cat/quotations/${QUOTATION_ID}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Loading Quotation Workspace...', { state: 'detached', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const deliveryTab = page.locator('button:has-text("Customer Delivery")').first();
    await deliveryTab.waitFor({ state: 'visible', timeout: 30000 });
    await deliveryTab.click();
    await page.waitForSelector('text=Loading Customer Delivery...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Open the Snapshot Viewer via "View Snapshot" on the Current Published Revision card.
    await page.click('button:has-text("View Snapshot")');
    await page.waitForSelector('text=Loading snapshot...', { state: 'detached', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);

    // Screen view, for contrast.
    await page.screenshot({ path: 'scratch/printfix1-screen-view.png', fullPage: true });

    // Emulate print media — this is exactly what window.print() would render.
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'scratch/printfix2-print-media.png', fullPage: true });

    // Also generate a real PDF via Chromium's print pipeline, to prove pagination/margins work.
    await page.pdf({ path: 'scratch/printfix3-output.pdf', format: 'A4', margin: { top: '0.75in', bottom: '0.75in', left: '0.75in', right: '0.75in' } });

    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
    await page.screenshot({ path: 'scratch/printfix-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
