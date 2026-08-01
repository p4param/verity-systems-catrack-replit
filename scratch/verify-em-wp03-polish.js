const { chromium } = require('playwright-core');

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

    await page.goto('http://localhost:5000/cat/events', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Loading Event Directory...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(800);

    const firstRow = page.locator('.divide-y > div.grid.cursor-pointer').first();
    await firstRow.click();
    await page.waitForSelector('text=Event Workspaces', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);

    await page.click('button:has-text("Menu Planning")');
    await page.waitForSelector('text=Menu Planning', { timeout: 30000 }).catch(() => {});
    await page.waitForFunction(() => !document.body.innerText.includes('Loading...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(600);

    await page.screenshot({ path: 'scratch/em-wp03-polish-1-default.png', fullPage: true });

    // Verify Guest Count text is present in the meal card header.
    const bodyText = await page.innerText('body');
    console.log('Shows "guests" in meal header:', bodyText.includes('guests') || bodyText.includes('Guest count not set'));
    console.log('Menu Summary present:', bodyText.includes('Menu Summary'));
    console.log('Service Instructions card wording (Present/None):', bodyText.includes('Present') || bodyText.includes('None'));

    // Collapse the category (click the first chevron toggle button near "Main Course").
    const collapseButtons = page.locator('button[title="Collapse Category"]');
    const collapseCount = await collapseButtons.count();
    console.log('Collapsible category toggle buttons found:', collapseCount);
    if (collapseCount > 0) {
      await collapseButtons.first().click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: 'scratch/em-wp03-polish-2-collapsed.png', fullPage: true });

      const expandButtons = page.locator('button[title="Expand Category"]');
      const expandCount = await expandButtons.count();
      console.log('After collapse, expand-labeled buttons found:', expandCount);

      // Re-expand.
      await expandButtons.first().click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: 'scratch/em-wp03-polish-3-reexpanded.png', fullPage: true });
    }

    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
  } finally {
    await browser.close();
  }
})();
