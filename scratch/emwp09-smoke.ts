import { chromium } from 'playwright-core';
import path from 'path';

const BASE = 'http://localhost:5000';
const SHOT_DIR = path.join(__dirname, 'emwp09-screenshots');

async function shot(page: any, name: string) {
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage: true });
  console.log(`[screenshot] ${name}`);
}

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on('console', (msg: any) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err: any) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on('response', (res: any) => {
    if (res.status() >= 400) console.log(`[HTTP ${res.status()}] ${res.url()}`);
  });

  try {
    await runFlow(page);
  } catch (err) {
    console.error('FLOW FAILED, capturing diagnostic screenshot:', err);
    await shot(page, 'ERROR-state');
    console.log('URL at failure:', page.url());
    throw err;
  } finally {
    console.log('Console errors collected:', consoleErrors);
    await browser.close();
  }
}

async function runFlow(page: any) {
  console.log('--- Login ---');
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email', { state: 'visible' });
  const emailInput = page.locator('#email');
  const passwordInput = page.locator('#password');
  await emailInput.click();
  await emailInput.type('admin@verity.com', { delay: 20 });
  await passwordInput.click();
  await passwordInput.type('Admin@123', { delay: 20 });
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((url: URL) => !url.pathname.includes('/login'), { timeout: 25000, waitUntil: 'domcontentloaded' });
  console.log('Logged in, URL:', page.url());

  console.log('--- Navigate to Events list ---');
  await page.goto(`${BASE}/cat/events`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading Event Directory'), { timeout: 15000 });
  await page.waitForTimeout(500);
  await shot(page, '03-events-list');

  // Click the first event row (event number badge text, e.g. "EVT-2026-000011").
  const eventRow = page.locator('text=/EVT-\\d{4}-\\d+/').first();
  await eventRow.waitFor({ state: 'visible', timeout: 10000 });
  console.log('First event row text:', await eventRow.textContent());
  await eventRow.click();
  await page.waitForURL(/\/cat\/events\/[^/]+$/, { timeout: 10000 });
  await page.waitForTimeout(1000);
  await shot(page, '04-event-overview');

  console.log('--- Open Menu Planning tab ---');
  await page.locator('button:has-text("Menu Planning"), a:has-text("Menu Planning")').first().click();
  await page.waitForTimeout(1500);
  await shot(page, '05-menu-planning-tab');

  console.log('--- Add Menu Item via Choose From Catalog ---');
  const addMenuItemButtons = page.locator('button:has-text("Add Menu Item")');
  const addCount = await addMenuItemButtons.count();
  console.log('Add Menu Item buttons found:', addCount);
  if (addCount === 0) {
    console.log('No categories with an Add Menu Item button visible — may need a Category first.');
    await shot(page, '05b-no-add-item-button');
  } else {
    await addMenuItemButtons.first().click();
    await page.waitForTimeout(500);
    await shot(page, '06-add-item-dialog');
    await page.locator('text=Choose From Catalog').first().click();
    await page.waitForTimeout(500);
    await shot(page, '07-catalog-picker');

    const searchInput = page.locator('input[placeholder*="Search name"]');
    await searchInput.fill('Paneer Butter Masala');
    await page.waitForTimeout(700);
    await shot(page, '08-catalog-search-results');

    const resultButton = page.locator('button:has-text("Paneer Butter Masala")').first();
    await resultButton.waitFor({ state: 'visible', timeout: 5000 });
    await resultButton.click();
    // First hit to the recipes API can trigger Next dev-mode on-demand route
    // compilation — wait for the dialog to actually close rather than a
    // fixed short timeout.
    await page.locator('text=Choose From Catalog').first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {
      console.log('Dialog did not close within 15s — capturing state anyway.');
    });
    await shot(page, '09-item-added');

    console.log('--- Locate the Paneer Butter Masala row precisely ---');
    // Scope everything to the exact row (the bg-card ancestor of the Name
    // input whose value is "Paneer Butter Masala") — the page has other
    // rows with identical empty "Quantity"/"Unit" placeholders.
    const nameInput = page.locator('input[value="Paneer Butter Masala"]').first();
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    const row = nameInput.locator('xpath=ancestor::div[contains(@class,"bg-card")][1]');

    const recipeChip = row.locator('button:has-text("Recipe")').first();
    const chipVisible = await recipeChip.isVisible().catch(() => false);
    console.log('Recipe chip visible:', chipVisible);
    if (chipVisible) {
      await recipeChip.click();
      await row.locator('text=Scale Factor').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
        console.log('Recipe Scaling panel did not appear within 10s.');
      });
      await shot(page, '10-recipe-panel-expanded');
      console.log('Panel text:', await row.locator('text=Scale Factor').first().isVisible().catch(() => false));

      const qtyInput = row.locator('input[placeholder="Quantity"]').first();
      const unitInput = row.locator('input[placeholder="Unit"]').first();
      await qtyInput.fill('10');
      await unitInput.fill('kg');
      await page.waitForTimeout(600);
      await shot(page, '11-quantity-unit-set');
      const scaleFactorText = await row.locator('text=/\\d+\\.\\d+×/').first().textContent().catch(() => null);
      console.log('Scale Factor shown:', scaleFactorText);

      const variantSelect = row.locator('select').first();
      const selectCount = await row.locator('select').count();
      console.log('Select elements within row:', selectCount);
      if (selectCount > 0) {
        const options = await variantSelect.locator('option').allTextContents();
        console.log('Variant options:', options);
        const jainOption = options.find((o) => o.includes('Jain'));
        if (jainOption) {
          await variantSelect.selectOption({ label: jainOption });
          await page.waitForTimeout(600);
          await shot(page, '10b-jain-variant-selected');
          const ingredientsText = await row.locator('text=Scaled Ingredients').locator('xpath=..').textContent().catch(() => null);
          console.log('Jain ingredients panel text:', ingredientsText);
        }
      }
    }
  }

  console.log('--- Save Menu ---');
  const eventUrl = page.url();
  const saveButton = page.locator('button:has-text("Save Menu")');
  if (await saveButton.count() > 0) {
    await saveButton.first().click();
    await page.waitForTimeout(1500);
    await shot(page, '12-after-save');
  }

  console.log('--- Reload and verify persistence ---');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('button:has-text("Menu Planning")').first().click();
  await page.waitForTimeout(1500);
  const persistedNameInput = page.locator('input[value="Paneer Butter Masala"]').first();
  const persisted = await persistedNameInput.isVisible().catch(() => false);
  console.log('Paneer Butter Masala row persisted after reload:', persisted);
  if (persisted) {
    const persistedRow = persistedNameInput.locator('xpath=ancestor::div[contains(@class,"bg-card")][1]');
    const persistedChip = persistedRow.locator('button:has-text("Recipe")').first();
    await persistedChip.click();
    await persistedRow.locator('select').first().waitFor({ state: 'visible', timeout: 8000 });
    const selectedVariant = await persistedRow.locator('select').first().inputValue().catch(() => null);
    const selectedLabel = await persistedRow
      .locator('select option:checked')
      .first()
      .textContent()
      .catch(() => null);
    console.log('Persisted selected variant label:', selectedLabel);
    const persistedQty = await persistedRow.locator('input[placeholder="Quantity"]').first().inputValue();
    const persistedUnit = await persistedRow.locator('input[placeholder="Unit"]').first().inputValue();
    console.log('Persisted quantity/unit:', persistedQty, persistedUnit);
    await shot(page, '13-after-reload-persisted');
  }

  console.log('--- Check Menu Templates workspace is unchanged ---');
  await page.goto(`${BASE}/cat/menu-templates`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const templateLink = page.locator('a[href^="/cat/menu-templates/"]').first();
  const hasTemplateLink = await templateLink.count();
  console.log('Menu Template links found:', hasTemplateLink);
  if (hasTemplateLink > 0) {
    await templateLink.click();
    await page.waitForURL(/\/cat\/menu-templates\/[^/]+$/, { timeout: 10000 });
    await page.waitForTimeout(1500);
    await shot(page, '14-menu-template-workspace');
    const recipeChipsOnTemplate = await page.locator('button:has-text("Recipe")').count();
    console.log('Recipe chips visible on Menu Templates workspace (should be 0):', recipeChipsOnTemplate);
  }
}

main().catch((err) => {
  console.error('SMOKE TEST FAILED:', err);
  process.exit(1);
});
