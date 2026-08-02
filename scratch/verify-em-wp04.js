const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

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

    // 1. Sidebar: Operations > Menu Templates
    await page.waitForSelector('text=Operations', { timeout: 30000 }).catch(() => {});
    await page.click('text=Operations');
    await page.waitForTimeout(800);
    const menuTemplatesLink = page.locator('a[href="/cat/menu-templates"]').first();
    console.log('Operations > Menu Templates sidebar link visible:', await menuTemplatesLink.isVisible().catch(() => false));

    // 2. Menu Templates Directory -> Quick Create "Test Template A"
    await page.goto('http://localhost:5000/cat/menu-templates', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Loading Menu Template Directory...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'scratch/em-wp04-1-directory.png', fullPage: true });

    await page.click('button:has-text("Quick Create Template")');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="e.g. Standard Wedding Menu"]', 'Test Template A');
    await page.fill('textarea[placeholder="Optional context for when to use this template."]', 'Playwright verification template.');
    await page.click('button:has-text("Create & Open Workspace")');
    await page.waitForURL((url) => url.pathname.startsWith('/cat/menu-templates/') && url.pathname !== '/cat/menu-templates/', { timeout: 30000 }).catch(() => {});
    await page.waitForSelector('text=Menu Summary', { timeout: 60000 }).catch(() => {});
    await page.waitForFunction(() => !document.body.innerText.includes('Loading...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(600);
    console.log('Template Workspace URL after create:', page.url());

    // 3. Add Meal -> Category -> Item, then Save Template
    await page.click('button:has-text("Add Meal")');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="Meal name (e.g. Lunch, Dinner, Hi-Tea)"]', 'Dinner Service');
    await page.click('button:has-text("Add Category")');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="Category name (e.g. Starters)"]', 'Main Course');
    await page.click('button:has-text("Add Menu Item")');
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="Name"]').first().fill('Butter Chicken');
    await page.locator('input[placeholder="Quantity"]').first().fill('10');
    await page.locator('input[placeholder="Unit"]').first().fill('kg');

    await page.click('button:has-text("Save Template")');
    await page.waitForFunction(() => !document.body.innerText.includes('Saving...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'scratch/em-wp04-2-template-saved.png', fullPage: true });

    // 4. Navigate to the primary Event's Menu Planning tab.
    await page.goto('http://localhost:5000/cat/events', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Loading Event Directory...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.click('text=EVT-2026-000001');
    await page.waitForSelector('text=Event Workspaces', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(800);
    await page.click('button:has-text("Menu Planning")');
    await page.waitForSelector('text=Menu Planning', { timeout: 30000 }).catch(() => {});
    await page.waitForFunction(() => !document.body.innerText.includes('Loading...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'scratch/em-wp04-3-event-menu-before.png', fullPage: true });

    // 5. Save as Template
    await page.click('button:has-text("Save as Template")');
    await page.waitForTimeout(400);
    await page.fill('input[placeholder="e.g. Standard Wedding Menu"]', 'Saved From Event EVT-2026-000001');
    await page.click('[role="alertdialog"] button:has-text("Save as Template")');
    await page.waitForSelector('[role="alertdialog"] button:has-text("Open Template")', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'scratch/em-wp04-4-save-as-template-success.png', fullPage: true });
    const dialogText1 = await page.locator('[role="alertdialog"]').innerText().catch(() => '');
    console.log('Save as Template dialog success text includes template name:', dialogText1.includes('Saved From Event'));
    await page.click('[role="alertdialog"] button:has-text("Close")');
    await page.waitForSelector('[role="alertdialog"]', { state: 'detached', timeout: 15000 }).catch(() => {});

    // 6. Apply Template -> "Test Template A" (should replace current menu with Dinner Service/Main Course/Butter Chicken)
    await page.click('button:has-text("Apply Template")');
    await page.waitForTimeout(500);
    await page.selectOption('[role="alertdialog"] select', { label: 'Test Template A' });
    await page.click('[role="alertdialog"] button:has-text("Replace Menu")');
    await page.waitForSelector('[role="alertdialog"]', { state: 'detached', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'scratch/em-wp04-5-after-apply-template.png', fullPage: true });
    const bodyAfterApply = await page.innerText('body');
    console.log('Event menu shows "Butter Chicken" after Apply Template:', bodyAfterApply.includes('Butter Chicken') || (await page.locator('input[value="Butter Chicken"]').count()) > 0);

    // 7. Copy From Event -> EVT-2026-TEST002 (should replace menu with Breakfast/Continental/Croissant Basket)
    await page.click('button:has-text("Copy From Event")');
    await page.waitForTimeout(500);
    const sourceEventOptionValue = await page.locator('[role="alertdialog"] select option', { hasText: 'EVT-2026-TEST002' }).getAttribute('value');
    await page.selectOption('[role="alertdialog"] select', sourceEventOptionValue);
    await page.click('[role="alertdialog"] button:has-text("Replace Menu")');
    await page.waitForSelector('[role="alertdialog"]', { state: 'detached', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'scratch/em-wp04-6-after-copy-from-event.png', fullPage: true });
    const croissantInput = await page.locator('input[value="Croissant Basket"]').count();
    console.log('Event menu shows "Croissant Basket" after Copy From Event:', croissantInput > 0);

    // 8. Reload to confirm persistence via a real GET.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Event Workspaces', { timeout: 60000 }).catch(() => {});
    await page.click('button:has-text("Menu Planning")');
    await page.waitForFunction(() => !document.body.innerText.includes('Loading...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(800);
    const croissantAfterReload = await page.locator('input[value="Croissant Basket"]').count();
    console.log('"Croissant Basket" persisted after reload:', croissantAfterReload > 0);
    await page.screenshot({ path: 'scratch/em-wp04-7-final-reloaded.png', fullPage: true });

    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
  } finally {
    await browser.close();
  }
})();
