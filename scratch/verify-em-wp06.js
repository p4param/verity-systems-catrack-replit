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

    // Create a fresh Catalog item to test Recipes on.
    await page.goto('http://localhost:5000/cat/menu-catalog', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Compiling', { state: 'detached', timeout: 90000 }).catch(() => {});
    await page.waitForSelector('text=Loading Menu Catalog...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(600);
    await page.click('button:has-text("Quick Create Item")');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder="e.g. Butter Chicken"]', 'Tandoori Platter');
    await page.click('button:has-text("Create & Open Workspace")');
    await page.waitForURL((url) => url.pathname.startsWith('/cat/menu-catalog/') && url.pathname !== '/cat/menu-catalog/', { timeout: 30000 }).catch(() => {});
    await page.waitForSelector('text=Compiling', { state: 'detached', timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(800);
    console.log('Catalog Workspace URL:', page.url());
    console.log('Overview/Recipes tabs visible:', await page.locator('button:has-text("Overview")').isVisible().catch(() => false), await page.locator('button:has-text("Recipes")').isVisible().catch(() => false));

    // Switch to Recipes tab.
    await page.click('button:has-text("Recipes")');
    await page.waitForSelector('text=Compiling', { state: 'detached', timeout: 90000 }).catch(() => {});
    await page.waitForFunction(() => !document.body.innerText.includes('Loading Recipes...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(600);
    console.log('Empty state shown:', await page.locator('text=No Recipe Variants yet').isVisible().catch(() => false));
    await page.screenshot({ path: 'scratch/em-wp06-1-recipes-empty.png', fullPage: true });

    // Add first Variant -> should auto-become Default.
    await page.click('button:has-text("Add Variant")');
    await page.waitForTimeout(500);
    console.log('First variant shows "Default Variant" button (auto-default):', await page.locator('button:has-text("Default Variant")').isVisible().catch(() => false));

    await page.fill('input[placeholder="e.g. Standard, Bulk Catering, Vegan"]', 'Standard');
    await page.fill('textarea[placeholder="Brief description of this Variant — what makes it distinct, when to use it."]', 'The default preparation for regular events.');
    await page.fill('input[placeholder="e.g. 10"]', '20');
    await page.fill('input[placeholder="e.g. portions, kg"]', 'portions');

    await page.click('button:has-text("Add Ingredient")');
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="Ingredient"]').first().fill('Chicken Thigh');
    await page.locator('input[placeholder="Quantity"]').first().fill('2');
    await page.locator('input[placeholder="Unit"]').first().fill('kg');

    await page.click('button:has-text("Add Step")');
    await page.waitForTimeout(300);
    await page.locator('textarea[placeholder="Describe this step."]').first().fill('Marinate chicken in yogurt and spices for 4 hours.');

    await page.click('button:has-text("Add Equipment")');
    await page.waitForTimeout(300);
    await page.locator('input[placeholder="e.g. Tandoor"]').first().fill('Tandoor Oven');

    await page.fill('textarea[placeholder*="Uniform char marks"]', 'Internal temp 165F, visible char marks.');

    await page.screenshot({ path: 'scratch/em-wp06-2-variant-filled.png', fullPage: true });

    await page.click('button:has-text("Save Recipes")');
    await page.waitForFunction(() => !document.body.innerText.includes('Saving...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(800);
    const saveError1 = await page.locator('text=/required for every|Exactly one/').isVisible().catch(() => false);
    console.log('Save shows validation error (should be false):', saveError1);
    await page.screenshot({ path: 'scratch/em-wp06-3-saved.png', fullPage: true });

    // Add a second Variant -> should NOT be default automatically.
    await page.click('button:has-text("Add Variant")');
    await page.waitForTimeout(500);
    console.log('Second variant shows "Set as Default" (not auto-default):', await page.locator('button:has-text("Set as Default")').isVisible().catch(() => false));
    await page.fill('input[placeholder="e.g. Standard, Bulk Catering, Vegan"]', 'Bulk Catering');
    await page.click('button:has-text("Set as Default")');
    await page.waitForTimeout(400);
    console.log('After Set as Default, button now shows "Default Variant":', await page.locator('button:has-text("Default Variant")').isVisible().catch(() => false));

    await page.click('button:has-text("Save Recipes")');
    await page.waitForFunction(() => !document.body.innerText.includes('Saving...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(800);
    const saveError2 = await page.locator('text=/required for every|Exactly one/').isVisible().catch(() => false);
    console.log('Second save shows validation error (should be false):', saveError2);
    await page.screenshot({ path: 'scratch/em-wp06-4-two-variants-saved.png', fullPage: true });

    // Reload and confirm persistence.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Compiling', { state: 'detached', timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Recipes")');
    await page.waitForFunction(() => !document.body.innerText.includes('Loading Recipes...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(800);
    const bodyText = await page.innerText('body');
    console.log('After reload, shows "Standard" variant pill:', bodyText.includes('Standard'));
    console.log('After reload, shows "Bulk Catering" variant pill:', bodyText.includes('Bulk Catering'));
    // Bulk Catering should be selected by default (it was set default + saved last... actually default status persisted, first variant shown selected may vary); click it to check its data.
    await page.click('button:has-text("Bulk Catering")');
    await page.waitForTimeout(400);
    console.log('Bulk Catering shows as Default after reload:', await page.locator('button:has-text("Default Variant")').isVisible().catch(() => false));
    await page.click('button:has-text("Standard")');
    await page.waitForTimeout(400);
    const chickenPersisted = await page.locator('input[value="Chicken Thigh"]').count();
    const stepPersisted = await page.locator('textarea', { hasText: 'Marinate chicken' }).count();
    console.log('"Chicken Thigh" ingredient persisted:', chickenPersisted > 0);
    await page.screenshot({ path: 'scratch/em-wp06-5-final-reloaded.png', fullPage: true });

    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
  } finally {
    await browser.close();
  }
})();
