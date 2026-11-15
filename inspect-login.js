try { require('dotenv').config(); } catch (e) {}
const { chromium } = require('@playwright/test');

(async () => {
  const base = (process.env.BASE_URL || 'https://uat.bcas-oasis.com').replace(/\/$/, '');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(base + '/auth/login');
  await page.waitForTimeout(4000);
  const info = await page.evaluate(() => {
    const attrs = (el) => ({
      tag: el.tagName.toLowerCase(), type: el.getAttribute('type'),
      name: el.getAttribute('name'), id: el.getAttribute('id'),
      placeholder: el.getAttribute('placeholder'), ariaLabel: el.getAttribute('aria-label'),
    });
    return {
      url: location.href,
      inputs: [...document.querySelectorAll('input, textarea, select')].map(attrs),
      buttons: [...document.querySelectorAll('button, [role=button]')].map((b) => ({
        text: (b.innerText || '').trim().slice(0, 40), type: b.getAttribute('type'),
      })),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: 'debug-login-page.png' });
  await browser.close();
})();