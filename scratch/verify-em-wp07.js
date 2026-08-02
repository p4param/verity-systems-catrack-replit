const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });

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
    console.log('Operations > Ingredient Master sidebar link visible:', await page.locator('a[href="/cat/ingredient-master"]').first().isVisible().catch(() => false));

    // 2. Directory -> Quick Create
    await page.goto('http://localhost:5000/cat/ingredient-master', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Compiling', { state: 'detached', timeout: 90000 }).catch(() => {});
    await page.waitForSelector('text=Loading Ingredient Master...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'scratch/em-wp07-1-directory.png', fullPage: true });

    await page.click('button:has-text("Quick Create Ingredient")');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="e.g. Basmati Rice"]', 'Paneer');
    await page.fill('input[placeholder="e.g. Grain"]', 'Dairy');
    await page.fill('input[placeholder="e.g. kg"]', 'kg');
    await page.click('button:has-text("Create & Open Workspace")');
    await page.waitForURL((url) => url.pathname.startsWith('/cat/ingredient-master/') && url.pathname !== '/cat/ingredient-master/', { timeout: 30000 }).catch(() => {});
    await page.waitForSelector('text=Compiling', { state: 'detached', timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(800);
    console.log('Workspace URL after create:', page.url());

    // 3. Fill remaining fields, save, reload
    await page.fill('input[placeholder="e.g. 50kg bag, case of 24"]', 'Block of 5kg');
    await page.fill('input[placeholder="e.g. Refrigerated, Frozen, Dry Storage"]', 'Refrigerated');
    await page.fill('input[placeholder="e.g. 7 days, 6 months"]', '10 days');
    await page.fill('textarea[placeholder*="Allergen"]', 'Perishable, keep chilled below 4C');
    await page.fill('input[placeholder="e.g. Produce, Dry Goods, Meat & Poultry"]', 'Dairy & Chilled');
    await page.fill('textarea[placeholder="Describe this ingredient."]', 'Fresh Indian cottage cheese.');
    await page.click('button:has-text("Save")');
    await page.waitForFunction(() => !document.body.innerText.includes('Saving...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'scratch/em-wp07-2-workspace-saved.png', fullPage: true });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const storageAfterReload = await page.locator('input[placeholder="e.g. Refrigerated, Frozen, Dry Storage"]').inputValue().catch(() => '');
    console.log('Storage persisted after reload:', storageAfterReload);

    // 4. Directory shows the new row with correct columns and filters work.
    await page.goto('http://localhost:5000/cat/ingredient-master', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Loading Ingredient Master...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(800);
    const bodyText = await page.innerText('body');
    console.log('Directory shows "Paneer" row:', bodyText.includes('Paneer'));
    console.log('Directory shows Ingredient Type "Dairy":', bodyText.includes('Dairy'));
    await page.screenshot({ path: 'scratch/em-wp07-3-directory-final.png', fullPage: true });

    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
  } finally {
    await browser.close();
  }
})();
