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

    // 1. Customer Delivery workspace (initial state).
    await page.screenshot({ path: 'scratch/pr1-workspace.png', fullPage: true });

    // 2. Manual Recipient flow.
    await page.fill('input[placeholder="Name"]', 'Jane Customer');
    await page.fill('input[placeholder="Email"]', 'jane.customer@example.com');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'scratch/pr2-manual-recipient.png', fullPage: true });

    // 3. Delivery History after sending (Email).
    await page.click('button:has-text("Send Email")');
    await page.waitForTimeout(1200);
    await page.locator('text=Delivery History').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'scratch/pr3-history-after-email.png', fullPage: true });

    // 4. PDF Download workflow.
    await page.locator('text=Delivery Composer').scrollIntoViewIfNeeded();
    await page.click('button:has-text("PDF Download")');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'scratch/pr4a-pdf-composer.png', fullPage: true });
    await page.click('button:has-text("Download PDF")');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'scratch/pr4b-pdf-snapshot-dialog.png' });
    // Scroll within the dialog to reveal the Print / Save as PDF footer button.
    const dialogContent = page.locator('[role="dialog"]');
    await dialogContent.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'scratch/pr4c-pdf-print-button.png' });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // 5. Delivery History after PDF download.
    await page.locator('text=Delivery History').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'scratch/pr5-history-after-pdf.png', fullPage: true });

    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
    await page.screenshot({ path: 'scratch/pr-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
