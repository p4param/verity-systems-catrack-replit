const { chromium } = require('playwright-core');

const QUOTATION_ID = '20b7afb2-da95-4473-9ffa-201329d22d6b';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const failed = [];
  const consoleErrors = [];
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(`${res.status()} ${res.request().method()} ${res.url()}`);
  });
  const debugLogs = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.text().startsWith('[DEBUG]')) debugLogs.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));

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

    const tab = page.locator('button:has-text("Event Conversion")').first();
    await tab.waitFor({ state: 'visible', timeout: 30000 });
    await tab.click();
    await page.waitForSelector('text=Loading Event Conversion...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'scratch/evt1-workspace.png', fullPage: true });

    // Click Convert to Event (should be enabled — revision published, decision Accepted).
    const convertBtn = page.locator('button:has-text("Convert to Event")').first();
    const isDisabled = await convertBtn.isDisabled();
    console.log('Convert to Event button disabled?', isDisabled);

    if (!isDisabled) {
      await convertBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'scratch/evt2-confirm-dialog.png' });

      await page.locator('[role="alertdialog"] button:has-text("Convert to Event")').click(); // confirm inside dialog
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'scratch/evt3a-immediately-after-click.png' });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: 'scratch/evt3-success-dialog.png' });
      const dialogStillOpen = await page.locator('[role="alertdialog"]').count();
      console.log('Alertdialog elements present after click+wait:', dialogStillOpen);
    }

    console.log('Debug logs:', JSON.stringify(debugLogs, null, 2));
    console.log('Console errors:', JSON.stringify(consoleErrors, null, 2));
    console.log('Failed requests:', JSON.stringify(failed, null, 2));
    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
    await page.screenshot({ path: 'scratch/evt-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
