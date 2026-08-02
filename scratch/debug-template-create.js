const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  page.on('dialog', async (dialog) => {
    console.log('DIALOG:', dialog.message());
    await dialog.dismiss();
  });
  page.on('response', async (res) => {
    if (res.url().includes('/api/cat/menu-templates')) {
      console.log('RESPONSE', res.status(), res.url());
      try {
        console.log('BODY', await res.text());
      } catch (e) {}
    }
  });
  page.on('console', (msg) => console.log('CONSOLE:', msg.type(), msg.text()));

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

    await page.goto('http://localhost:5000/cat/menu-templates', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Compiling', { state: 'detached', timeout: 90000 }).catch(() => {});
    await page.waitForSelector('text=Loading Menu Template Directory...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    await page.click('button:has-text("Quick Create Template")');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder="e.g. Standard Wedding Menu"]', 'Debug Template');
    await page.click('button:has-text("Create & Open Workspace")');
    await page.waitForTimeout(3000);
    console.log('URL after submit:', page.url());

    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
  } finally {
    await browser.close();
  }
})();
