const { chromium } = require('playwright-core');

const QUOTATION_ID = '20b7afb2-da95-4473-9ffa-201329d22d6b';

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

    await page.goto(`http://localhost:5000/cat/quotations/${QUOTATION_ID}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Loading Quotation Workspace...', { state: 'detached', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // 1. Default view: Proposal Health should list all 11, Continue should
    // say "Next up: Proposal Review" since all 7 authoring items are
    // already Ready (per Proposal Health checklist seen in prior sessions).
    await page.screenshot({ path: 'scratch/healthcont1-default.png', fullPage: true });

    const nextUpText = await page.locator('text=Next up:').locator('xpath=..').innerText().catch(() => 'N/A');
    console.log('Next up (default, all authoring ready):', nextUpText);

    // 2. Click Continue -> should land on Proposal Review, and Next up should now say Revisions.
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(600);
    console.log('After 1st Continue click, URL tab active - screenshot taken');
    await page.screenshot({ path: 'scratch/healthcont2-after-continue-1.png', fullPage: true });

    // 3. Click Continue again -> Customer Delivery
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'scratch/healthcont3-after-continue-2.png', fullPage: true });

    // 4. Click Continue again -> Customer Decision
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'scratch/healthcont4-after-continue-3.png', fullPage: true });

    // 5. On Customer Decision now - should show completion message, no Continue button.
    const continueBtnCount = await page.locator('button:has-text("Continue")').count();
    console.log('Continue button count on final step (should be 0):', continueBtnCount);
    await page.screenshot({ path: 'scratch/healthcont5-complete.png', fullPage: true });

    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
  } finally {
    await browser.close();
  }
})();
