const { chromium } = require('playwright-core');

const QUOTATION_ID = '20b7afb2-da95-4473-9ffa-201329d22d6b';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
  const failed = [];
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(`${res.status()} ${res.request().method()} ${res.url()}`);
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
    failed.length = 0;

    await page.goto(`http://localhost:5000/cat/quotations/${QUOTATION_ID}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await page.waitForSelector('text=Loading Quotation Workspace...', { state: 'detached', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const deliveryTab = page.locator('button:has-text("Customer Delivery")').first();
    await deliveryTab.waitFor({ state: 'visible', timeout: 30000 });
    await deliveryTab.click();
    await page.waitForSelector('text=Loading Customer Delivery...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scratch/delivery1-workspace.png', fullPage: true });

    // Contacts join is blocked by a pre-existing tenant_id data bug in
    // cat_contacts (unrelated to this feature) — verify via manual recipient only.
    await page.fill('input[placeholder="Name"]', 'Manual Test Recipient');
    await page.fill('input[placeholder="Email"]', 'manual-test@example.com');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'scratch/delivery2-recipients-selected.png', fullPage: true });

    // Send Email.
    await page.click('button:has-text("Send Email")');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'scratch/delivery3-after-email-send.png', fullPage: true });

    // Switch to PDF Download and deliver.
    await page.click('button:has-text("PDF Download")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Download PDF")');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'scratch/delivery4-after-pdf-download.png', fullPage: true });

    console.log('Failed requests:', JSON.stringify(failed, null, 2));
    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
    await page.screenshot({ path: 'scratch/delivery-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
