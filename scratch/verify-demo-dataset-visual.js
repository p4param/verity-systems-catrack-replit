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

    // Ingredient Master Directory
    await page.goto('http://localhost:5000/cat/ingredient-master', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Compiling', { state: 'detached', timeout: 90000 }).catch(() => {});
    await page.waitForSelector('text=Loading Ingredient Master...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scratch/demo-1-ingredient-master.png', fullPage: false });

    // Menu Catalog Directory
    await page.goto('http://localhost:5000/cat/menu-catalog', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Loading Menu Catalog...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scratch/demo-2-menu-catalog.png', fullPage: false });

    // Open Paneer Tikka and check Recipes tab
    await page.fill('input[placeholder="Search name, category or cuisine..."]', 'Paneer Tikka');
    await page.waitForTimeout(600);
    await page.click('text=Paneer Tikka');
    await page.waitForSelector('text=Compiling', { state: 'detached', timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Recipes")');
    await page.waitForFunction(() => !document.body.innerText.includes('Loading Recipes...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'scratch/demo-3-paneer-tikka-recipes.png', fullPage: true });

    // Menu Templates Directory
    await page.goto('http://localhost:5000/cat/menu-templates', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Loading Menu Template Directory...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scratch/demo-4-menu-templates.png', fullPage: false });

    // Events Directory
    await page.goto('http://localhost:5000/cat/events', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('text=Loading Event Directory...', { state: 'detached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scratch/demo-5-events-directory.png', fullPage: true });

    // Open the Rahul & Priya event (event name = quotation title) -> Overview, Planning, Menu Planning
    await page.click('text=Wedding Proposal — Rahul & Priya');
    await page.waitForSelector('text=Event Workspaces', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scratch/demo-6-event-overview.png', fullPage: true });

    await page.click('button:has-text("Planning")');
    await page.waitForFunction(() => !document.body.innerText.includes('Loading...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'scratch/demo-7-event-planning.png', fullPage: true });

    await page.click('button:has-text("Menu Planning")');
    await page.waitForFunction(() => !document.body.innerText.includes('Loading...'), { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'scratch/demo-8-event-menu.png', fullPage: true });

    // Quotations Directory
    await page.goto('http://localhost:5000/cat/quotations', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'scratch/demo-9-quotations-directory.png', fullPage: false });

    // Relationships / Inquiries directories quick check
    await page.goto('http://localhost:5000/cat/inquiries', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'scratch/demo-10-inquiries-directory.png', fullPage: false });

    console.log('DONE');
  } catch (e) {
    console.error('ERROR', e.message);
  } finally {
    await browser.close();
  }
})();
