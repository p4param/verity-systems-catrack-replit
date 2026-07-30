const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  try {
    await page.goto('http://localhost:5000/login', { waitUntil: 'load', timeout: 90000 });
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(1500);
    await emailInput.click();
    await emailInput.type('admin@verity.com', { delay: 30 });
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await passwordInput.click();
    await passwordInput.type('Admin@123', { delay: 30 });
    await page.waitForTimeout(300);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60000 });
    await page.waitForTimeout(1000);

    // 1. Quotation Directory - Status/Revision grouped column
    await page.goto('http://localhost:5000/cat/quotations', { waitUntil: 'load', timeout: 60000 });
    await page.waitForSelector('text=Loading Quotation Directory...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scratch/ux1-directory.png', fullPage: true });

    // 2. Quick Create - inquiry summary after selection
    await page.click('button:has-text("Quick Create Quotation")');
    await page.waitForTimeout(600);
    const searchInput = page.locator('input[placeholder*="Type to search inquiry"]');
    await searchInput.waitFor({ state: 'visible', timeout: 15000 });
    await searchInput.fill('co');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'scratch/ux2a-quick-create-dropdown.png' });
    const firstResult = page.locator('div.absolute.z-50 button').first();
    await firstResult.waitFor({ state: 'visible', timeout: 15000 });
    await firstResult.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'scratch/ux2-quick-create-summary.png' });
    await page.keyboard.press('Escape');

    // Grab an existing quotation id to inspect Proposal Summary + Inquiry workspace tab
    const listRes = await page.evaluate(async () => {
      const r = await fetch('/api/cat/quotations');
      return r.json();
    });
    console.log('Quotations found:', listRes.items ? listRes.items.length : 0);

    if (listRes.items && listRes.items.length > 0) {
      const q = listRes.items[0];
      await page.goto(`http://localhost:5000/cat/quotations/${q.id}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForSelector('text=Loading Quotation Workspace...', { state: 'detached', timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'scratch/ux3-proposal-summary-source-inquiry.png', fullPage: true });

      await page.goto(`http://localhost:5000/cat/inquiries/${q.inquiryId}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForSelector('text=Loading Inquiry Workspace', { state: 'detached', timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(1000);
      const quotationsTab = page.locator('button:has-text("Quotations")').first();
      await quotationsTab.waitFor({ state: 'visible', timeout: 30000 });
      await quotationsTab.click();
      await page.waitForSelector('text=Loading Quotations...', { state: 'detached', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(800);
      await page.screenshot({ path: 'scratch/ux4-inquiry-quotations-panel.png', fullPage: true });
    }

    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
    await page.screenshot({ path: 'scratch/ux-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
