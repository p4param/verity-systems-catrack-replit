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

    // Go to Events Directory, open the one known event.
    await page.goto('http://localhost:5000/cat/events', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Loading Event Directory...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(800);

    const firstRow = page.locator('.divide-y > div.grid.cursor-pointer').first();
    await firstRow.click();
    await page.waitForSelector('text=Event Workspaces', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Switch to Planning tab.
    await page.click('button:has-text("Planning")');
    await page.waitForSelector('text=Event Planning', { timeout: 30000 }).catch(() => {});
    // First hit of the new /planning API route triggers Next dev's
    // on-demand compile — wait for both "Loading..." list placeholders to
    // clear before interacting, not a fixed timeout.
    await page.waitForFunction(() => !document.body.innerText.includes('Loading...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'scratch/em-wp02-1-planning-empty.png', fullPage: true });

    // 1. Operational Summary
    await page.fill('input[placeholder="e.g. Ravi Kumar"]', 'Priya Sharma');
    await page.fill('input[placeholder="e.g. +91 98765 43210"]', '+91 90000 11111');
    await page.fill('input[placeholder="e.g. ops@company.com"]', 'priya.ops@company.com');
    await page.fill('textarea[placeholder="High-level operational brief for the team executing this event."]', 'Wedding reception for 250 guests — full-service catering with live counters.');

    // 2. Event Timeline — add one entry
    await page.click('button:has-text("Add Timeline Entry")');
    await page.fill('input[placeholder="e.g. 4:00 PM"]', '4:00 PM');
    await page.fill('input[placeholder="Activity"]', 'Vendor setup begins');
    await page.fill('input[placeholder="Responsible party"]', 'Ops Team');

    // 3. Key Contacts — add one entry
    await page.click('button:has-text("Add Contact")');
    await page.fill('input[placeholder="Name"]', 'Amit Verma');
    await page.fill('input[placeholder="Role"]', 'Venue Manager');
    await page.fill('input[placeholder="Phone"]', '+91 98111 22333');

    // 4. Operational Notes
    await page.fill('textarea[placeholder="Internal operational notes for the team executing this event."]', 'Client prefers minimal floral scent due to guest allergy.');

    // 5. Risks & Special Instructions — add one entry
    await page.click('button:has-text("Add Risk / Instruction")');
    await page.fill('textarea[placeholder*="shellfish allergy"]', 'Family has a shellfish allergy — kitchen must avoid cross-contamination.');

    // 6. Planning Checklist — add one entry
    await page.click('button:has-text("Add Checklist Item")');
    await page.fill('input[placeholder="Checklist item"]', 'Confirm final guest count with client');

    await page.screenshot({ path: 'scratch/em-wp02-2-planning-filled.png', fullPage: true });

    // Save
    await page.click('button:has-text("Save Planning")');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'scratch/em-wp02-3-planning-saved.png', fullPage: true });

    // Reload the page fresh to confirm persistence.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Event Workspaces', { timeout: 60000 }).catch(() => {});
    await page.click('button:has-text("Planning")');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'scratch/em-wp02-4-planning-reloaded.png', fullPage: true });

    const ownerValue = await page.locator('input[placeholder="e.g. Ravi Kumar"]').inputValue();
    console.log('Operations Owner persisted after reload:', ownerValue);

    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
  } finally {
    await browser.close();
  }
})();
