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

    const decisionTab = page.locator('button:has-text("Customer Decision")').first();
    await decisionTab.waitFor({ state: 'visible', timeout: 30000 });
    await decisionTab.click();
    await page.waitForSelector('text=Loading Customer Decision...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const recordBtn = page.locator('button:has-text("Record Decision")');

    // Current decision is "Accepted" (from prior test). Fresh load, no
    // interaction yet -> button should be DISABLED.
    console.log('1. Fresh load, disabled?', await recordBtn.isDisabled());

    // Re-select the SAME currently-selected decision (Accepted) -> should
    // remain DISABLED (re-selecting same value is not a change).
    await page.click('button:has-text("Accepted"):not(:has-text("Conditions"))');
    console.log('2. Re-selected same decision (Accepted), disabled?', await recordBtn.isDisabled());

    // Select a DIFFERENT decision -> should become ENABLED.
    await page.click('button:has-text("Rejected")');
    console.log('3. Selected different decision (Rejected), disabled?', await recordBtn.isDisabled());

    // Switch back to the original current decision (Accepted), notes still
    // empty -> should go back to DISABLED.
    await page.click('button:has-text("Accepted"):not(:has-text("Conditions"))');
    console.log('4. Back to original decision (Accepted), no notes, disabled?', await recordBtn.isDisabled());

    // Type notes while decision matches current -> should become ENABLED.
    await page.fill('textarea[placeholder*="Record what the customer said"]', 'Just a note, no decision change.');
    console.log('5. Same decision + notes typed, disabled?', await recordBtn.isDisabled());

    // Clear notes back to empty, decision still matches current -> DISABLED again.
    await page.fill('textarea[placeholder*="Record what the customer said"]', '');
    console.log('6. Notes cleared back to empty, disabled?', await recordBtn.isDisabled());

    await page.screenshot({ path: 'scratch/decisionbtn1-state.png', fullPage: true });
    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
  } finally {
    await browser.close();
  }
})();
