const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('response', res => {
    if (res.url().includes('/api/auth')) {
      console.log('AUTH RESPONSE:', res.status(), res.url());
    }
  });
  page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url(), req.failure()?.errorText));
  try {
    await page.goto('http://localhost:5000/login', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(2000);
    await page.fill('input[type="email"], input[name="email"]', 'admin@verity.com');
    await page.fill('input[type="password"], input[name="password"]', 'Admin@123');
    const [response] = await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/auth/login'), { timeout: 30000 }).catch(e => { console.log('no login response captured:', e.message); return null; }),
      page.click('button[type="submit"]'),
    ]);
    if (response) {
      console.log('LOGIN RESPONSE STATUS:', response.status());
      const body = await response.text().catch(() => '(no body)');
      console.log('LOGIN RESPONSE BODY:', body.slice(0, 500));
    }
    await page.waitForTimeout(5000);
    console.log('URL after all waits:', page.url());
  } catch (e) {
    console.error('ERROR', e.message);
  } finally {
    await browser.close();
  }
})();
