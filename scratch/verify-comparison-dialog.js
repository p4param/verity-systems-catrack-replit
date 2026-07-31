const { chromium } = require('playwright-core');

const QUOTATION_ID = '20b7afb2-da95-4473-9ffa-201329d22d6b'; // QT-2026-000001, 5 published revisions

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
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

    // Go straight to the Quotation Workspace.
    await page.goto(`http://localhost:5000/cat/quotations/${QUOTATION_ID}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await page.waitForSelector('text=Loading Quotation Workspace...', { state: 'detached', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Click the Revisions tab.
    const revisionsTab = page.locator('button:has-text("Revisions")').first();
    await revisionsTab.waitFor({ state: 'visible', timeout: 30000 });
    await revisionsTab.click();
    await page.waitForSelector('text=Loading Revision Management...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scratch/rev1-workspace-tab.png', fullPage: true });

    // Select two revision checkboxes.
    const checkboxes = page.locator('input[type="checkbox"][aria-label*="Select Revision"]');
    const count = await checkboxes.count();
    console.log('Revision checkboxes found:', count);
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'scratch/rev2-two-selected.png', fullPage: true });

    // Open the comparison dialog.
    const compareBtn = page.locator('button:has-text("Compare Selected")');
    await compareBtn.waitFor({ state: 'visible', timeout: 10000 });
    await compareBtn.click();
    await page.waitForSelector('text=Loading comparison...', { state: 'detached', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'scratch/rev3-comparison-dialog.png' });

    console.log('Console errors:', JSON.stringify(consoleErrors, null, 2));
    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
    await page.screenshot({ path: 'scratch/rev-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
