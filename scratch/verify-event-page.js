const { chromium } = require('playwright-core');

const EVENT_ID = '28d028e3-bc84-4e08-b983-8b96cf921c19';

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

    await page.goto(`http://localhost:5000/cat/events/${EVENT_ID}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('text=Loading Event...', { state: 'detached', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scratch/eventpage1.png', fullPage: true });
    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
    await page.screenshot({ path: 'scratch/eventpage-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
