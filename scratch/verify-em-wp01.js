const { chromium } = require('playwright-core');

const EVENT_ID_QUOTATION_SOURCE = '20b7afb2-da95-4473-9ffa-201329d22d6b'; // QT with converted event (from QM-WP04E testing)

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

    // 1. Sidebar: Operations > Events nav item present (expand the group first)
    await page.click('text=Operations');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'scratch/em-wp01-1-sidebar.png', fullPage: true });
    const opsLink = page.locator('a[href="/cat/events"], a:has-text("Events")').first();
    const opsVisible = await opsLink.isVisible().catch(() => false);
    console.log('Operations > Events sidebar link visible:', opsVisible);

    // 2. Events Directory
    await page.goto('http://localhost:5000/cat/events', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Loading Event Directory...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scratch/em-wp01-2-directory.png', fullPage: true });

    // 3. Click first row -> Event Workspace
    const firstRow = page.locator('.divide-y > div.grid.cursor-pointer').first();
    const rowExists = await firstRow.isVisible().catch(() => false);
    console.log('Directory has at least one row:', rowExists);
    if (rowExists) {
      await firstRow.click();
      await page.waitForSelector('text=Event Workspaces', { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'scratch/em-wp01-3-workspace-overview.png', fullPage: true });

      // 4. View Snapshot button
      const viewSnapshotBtn = page.locator('button:has-text("View Snapshot")');
      const btnEnabled = await viewSnapshotBtn.isEnabled().catch(() => false);
      console.log('View Snapshot button enabled:', btnEnabled);
      if (btnEnabled) {
        await viewSnapshotBtn.click();
        await page.waitForTimeout(1200);
        await page.screenshot({ path: 'scratch/em-wp01-4-snapshot-dialog.png', fullPage: true });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }

      // 5. Open Source Quotation
      const openSourceBtn = page.locator('button:has-text("Open Source Quotation")');
      if (await openSourceBtn.isVisible().catch(() => false)) {
        await openSourceBtn.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: 'scratch/em-wp01-5-source-quotation.png', fullPage: true });
        console.log('URL after Open Source Quotation:', page.url());
      }
    }

    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
  } finally {
    await browser.close();
  }
})();
