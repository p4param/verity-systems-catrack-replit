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

    // 1. Sidebar check
    await page.waitForSelector('text=Operations', { timeout: 30000 }).catch(() => {});
    await page.click('text=Operations');
    await page.waitForTimeout(600);
    console.log('Operations > Menu Catalog sidebar link visible:', await page.locator('a[href="/cat/menu-catalog"]').first().isVisible().catch(() => false));

    // 2. Menu Catalog Directory -> Quick Create "Paneer Tikka"
    await page.goto('http://localhost:5000/cat/menu-catalog', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Compiling', { state: 'detached', timeout: 90000 }).catch(() => {});
    await page.waitForSelector('text=Loading Menu Catalog...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'scratch/em-wp05-1-directory.png', fullPage: true });

    await page.click('button:has-text("Quick Create Item")');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="e.g. Butter Chicken"]', 'Paneer Tikka');
    await page.fill('input[placeholder="e.g. Main Course"]', 'Starters');
    await page.fill('input[placeholder="e.g. North Indian"]', 'North Indian');
    await page.click('button:has-text("Create & Open Workspace")');
    await page.waitForURL((url) => url.pathname.startsWith('/cat/menu-catalog/') && url.pathname !== '/cat/menu-catalog/', { timeout: 30000 }).catch(() => {});
    await page.waitForSelector('text=Compiling', { state: 'detached', timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(800);
    console.log('Catalog Workspace URL after create:', page.url());

    // 3. Fill remaining fields, save, reload
    await page.fill('input[placeholder="e.g. kg, plate, pcs"]', 'plate');
    await page.fill('input[placeholder="e.g. Serve in a chafing dish"]', 'Serve hot with mint chutney');
    await page.fill('textarea[placeholder="Describe this menu item."]', 'Grilled cottage cheese marinated in spiced yogurt.');
    await page.click('button:has-text("Save")');
    await page.waitForFunction(() => !document.body.innerText.includes('Saving...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'scratch/em-wp05-2-workspace-saved.png', fullPage: true });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const unitAfterReload = await page.locator('input[placeholder="e.g. kg, plate, pcs"]').inputValue().catch(() => '');
    console.log('Default Unit persisted after reload:', unitAfterReload);

    // 4. Go to Event Menu Planning, test the Add Menu Item chooser
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

    // Ensure at least one Meal/Category exists to add an item under.
    const mealCount = await page.locator('input[placeholder="Meal name (e.g. Lunch, Dinner, Hi-Tea)"]').count();
    if (mealCount === 0) {
      await page.click('button:has-text("Add Meal")');
      await page.waitForTimeout(300);
      await page.fill('input[placeholder="Meal name (e.g. Lunch, Dinner, Hi-Tea)"]', 'Test Meal');
    }
    const categoryCount = await page.locator('input[placeholder="Category name (e.g. Starters)"]').count();
    if (categoryCount === 0) {
      await page.click('button:has-text("Add Category")');
      await page.waitForTimeout(300);
      await page.fill('input[placeholder="Category name (e.g. Starters)"]', 'Test Category');
    }

    await page.click('button:has-text("Add Menu Item")');
    await page.waitForSelector('text=Add Menu Item', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'scratch/em-wp05-3-chooser.png', fullPage: true });
    console.log('Chooser shows Choose From Catalog:', await page.locator('text=Choose From Catalog').first().isVisible().catch(() => false));
    console.log('Chooser shows Create One-off Item:', await page.locator('text=Create One-off Item').first().isVisible().catch(() => false));

    // 5. Choose From Catalog -> select Paneer Tikka
    await page.click('text=Choose From Catalog');
    await page.waitForSelector('text=Only Active Catalog items are shown.', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'scratch/em-wp05-4-catalog-picker.png', fullPage: true });
    await page.fill('input[placeholder="Search name, category or cuisine..."]', 'Paneer');
    await page.waitForTimeout(600);
    await page.click('text=Paneer Tikka');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'scratch/em-wp05-5-item-prefilled.png', fullPage: true });
    const prefilledName = await page.locator('input[placeholder="Name"]').last().inputValue().catch(() => '');
    const prefilledUnit = await page.locator('input[placeholder="Unit"]').last().inputValue().catch(() => '');
    console.log('Prefilled item name:', prefilledName);
    console.log('Prefilled item unit:', prefilledUnit);

    // 6. Regression: Create One-off Item still works (existing free-text workflow).
    await page.click('button:has-text("Add Menu Item")');
    await page.waitForTimeout(400);
    await page.click('text=Create One-off Item');
    await page.waitForTimeout(500);
    const nameInputCount = await page.locator('input[placeholder="Name"]').count();
    console.log('Menu Item rows after one-off add:', nameInputCount);
    // The API correctly requires a Name for every item — fill it in (this
    // is what a real user would do before saving).
    await page.locator('input[placeholder="Name"]').last().fill('Manual One-off Item');

    // 7. Save Menu, reload, confirm persistence.
    await page.click('button:has-text("Save Menu")');
    await page.waitForFunction(() => !document.body.innerText.includes('Saving...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(800);
    const saveErrorText = await page.locator('text=/required for every/').isVisible().catch(() => false);
    console.log('Save Menu shows a validation error (should be false):', saveErrorText);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Event Workspaces', { timeout: 60000 }).catch(() => {});
    await page.click('button:has-text("Menu Planning")');
    await page.waitForFunction(() => !document.body.innerText.includes('Loading...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(800);
    const paneerPersisted = await page.locator('input[value="Paneer Tikka"]').count();
    const oneOffPersisted = await page.locator('input[value="Manual One-off Item"]').count();
    console.log('"Paneer Tikka" item persisted after reload:', paneerPersisted > 0);
    console.log('"Manual One-off Item" persisted after reload:', oneOffPersisted > 0);
    await page.screenshot({ path: 'scratch/em-wp05-6-final-reloaded.png', fullPage: true });

    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
  } finally {
    await browser.close();
  }
})();
