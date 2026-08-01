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

    await page.goto('http://localhost:5000/cat/events', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Loading Event Directory...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(800);

    const firstRow = page.locator('.divide-y > div.grid.cursor-pointer').first();
    await firstRow.click();
    await page.waitForSelector('text=Event Workspaces', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Sanity check: Planning tab (EM-WP02) still works post-refactor.
    await page.click('button:has-text("Planning")');
    await page.waitForSelector('text=Event Planning', { timeout: 30000 }).catch(() => {});
    await page.waitForFunction(() => !document.body.innerText.includes('Loading...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(500);
    const ownerStillThere = await page.locator('input[placeholder="e.g. Ravi Kumar"]').inputValue().catch(() => '');
    console.log('EM-WP02 Planning still intact after refactor (Operations Owner):', ownerStillThere);

    // Switch to Menu Planning tab.
    await page.click('button:has-text("Menu Planning")');
    await page.waitForSelector('text=Menu Planning', { timeout: 30000 }).catch(() => {});
    await page.waitForFunction(() => !document.body.innerText.includes('Loading...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'scratch/em-wp03-1-menu-empty.png', fullPage: true });

    // Add a Meal.
    await page.click('button:has-text("Add Meal")');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="Meal name (e.g. Lunch, Dinner, Hi-Tea)"]', 'Dinner');

    // Add a Category under that Meal.
    await page.click('button:has-text("Add Category")');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="Category name (e.g. Starters)"]', 'Main Course');

    // Add a Menu Item under that Category.
    await page.click('button:has-text("Add Menu Item")');
    await page.waitForTimeout(300);
    const nameInputs = page.locator('input[placeholder="Name"]');
    await nameInputs.first().fill('Paneer Tikka Masala');
    await page.locator('input[placeholder="Quantity"]').first().fill('5');
    await page.locator('input[placeholder="Unit"]').first().fill('kg');
    await page.locator('textarea[placeholder="Remarks"]').first().fill('Medium spice, no nuts.');

    // Dietary Requirements
    await page.click('button:has-text("Add Dietary Requirement")');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="Requirement (e.g. Vegan)"]', 'Vegan');
    await page.fill('input[placeholder="Count"]', '12');
    await page.fill('input[placeholder="Notes"]', 'Separate serving counter required.');

    // Service Instructions
    await page.fill('textarea[placeholder="Free-form operational notes for how the menu should be served."]', 'Serve hot items last to maintain temperature.');

    await page.screenshot({ path: 'scratch/em-wp03-2-menu-filled.png', fullPage: true });

    // Check Menu Summary updated live before saving.
    const summaryText = await page.locator('text=Total Meals').locator('..').locator('..').innerText().catch(() => '');
    console.log('Summary card area text (pre-save):', summaryText.replace(/\n/g, ' | '));

    // Save
    await page.click('button:has-text("Save Menu")');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'scratch/em-wp03-3-menu-saved.png', fullPage: true });

    // Reload fresh to confirm persistence.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Event Workspaces', { timeout: 60000 }).catch(() => {});
    await page.click('button:has-text("Menu Planning")');
    await page.waitForFunction(() => !document.body.innerText.includes('Loading...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'scratch/em-wp03-4-menu-reloaded.png', fullPage: true });

    const mealNameAfterReload = await page.locator('input[placeholder="Meal name (e.g. Lunch, Dinner, Hi-Tea)"]').inputValue().catch(() => '');
    const itemNameAfterReload = await page.locator('input[placeholder="Name"]').first().inputValue().catch(() => '');
    console.log('Meal name persisted after reload:', mealNameAfterReload);
    console.log('Menu item name persisted after reload:', itemNameAfterReload);

    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
  } finally {
    await browser.close();
  }
})();
