const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  try {
    await page.goto('http://localhost:5000/login', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(2500);
    await page.fill('input[type="email"], input[name="email"]', 'admin@verity.com');
    await page.fill('input[type="password"], input[name="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 60000 });
    await page.waitForTimeout(1500);

    // 1. Check Sales nav group has Quotations
    const salesBtn = page.locator('button:has-text("Sales")').first();
    await salesBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'scratch/q1-sidebar.png' });
    const quotationsNavCount = await page.locator('text=Quotations').count();
    console.log('Quotations nav item count:', quotationsNavCount);

    // 2. Go to quotation directory
    await page.goto('http://localhost:5000/cat/quotations', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'scratch/q2-directory-empty.png' });

    // 3. Quick Create Quotation
    await page.click('button:has-text("Quick Create Quotation")');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder*="Type to search inquiry"]', 'Corporate');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'scratch/q3-inquiry-search.png' });
    const firstResult = page.locator('button', { hasText: 'Corporate' }).first();
    await firstResult.click();
    await page.waitForTimeout(300);
    await page.fill('input[placeholder*="Standard Proposal"]', 'Corporate Gala — Standard Proposal Test');
    await page.selectOption('select', 'PREMIUM_PROPOSAL');
    await page.fill('textarea', 'Internal test note for QM-WP01 verification.');
    await page.screenshot({ path: 'scratch/q4-create-form-filled.png' });
    await page.click('button:has-text("Create & Open Workspace")');
    await page.waitForTimeout(2000);
    console.log('URL after create:', page.url());
    await page.screenshot({ path: 'scratch/q5-workspace-proposal-summary.png' });

    // 4. Discovery Snapshot tab
    await page.click('button:has-text("Discovery Snapshot")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'scratch/q6-discovery-snapshot.png' });

    // 5. Placeholder tabs
    await page.click('button:has-text("Commercials")');
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'scratch/q7-placeholder-commercials.png' });

    const quotationUrl = page.url();
    const quotationId = quotationUrl.split('/').pop();
    console.log('Created quotation id:', quotationId);

    // 6. Back to directory, confirm listing
    await page.goto('http://localhost:5000/cat/quotations', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'scratch/q8-directory-with-item.png' });

    // 7. Check Inquiry workspace Quotations tab
    const inquiryLinkRow = page.locator('div', { hasText: 'INQ-' }).first();
    // Get inquiry id from quotation detail API instead for reliability
    const detailRes = await page.evaluate(async (qid) => {
      const r = await fetch(`/api/cat/quotations/${qid}`);
      return r.json();
    }, quotationId);
    console.log('Quotation detail inquiryId:', detailRes.quotation.inquiryId);

    await page.goto(`http://localhost:5000/cat/inquiries/${detailRes.quotation.inquiryId}`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1500);
    const quotationsTab = page.locator('button:has-text("Quotations")').first();
    await quotationsTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scratch/q9-inquiry-quotations-tab.png' });

    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
    await page.screenshot({ path: 'scratch/q-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
