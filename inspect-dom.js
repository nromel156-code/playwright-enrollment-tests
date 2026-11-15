// inspect-dom.js - saves the HTML of the form so selectors can be fixed from real DOM (read only, never clicks Submit).
// USAGE:  node inspect-dom.js
// 1. A browser opens on the enrollment form. 2. Put the form in the state you want to capture
//    (e.g. click the Department dropdown so the options are open; or click "Click Here to Add Sibling").
// 3. Come back to the terminal, type a short name (e.g. dept-open) and press Enter -> saves inspect-dom-<name>.html
// 4. Repeat for other states. Type  q  to quit. Send the .html files to your AI helper / teammate.
const { chromium } = require('@playwright/test');
const readline = require('readline');
const fs = require('fs');

const ask = (q) => new Promise((res) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(q, (a) => { rl.close(); res(a.trim()); });
});

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto('https://uat.bcas-oasis.com/enrollment/form');
  for (;;) {
    const name = await ask('Name for this snapshot (q to quit): ');
    if (!name || name.toLowerCase() === 'q') break;
    const html = await page.evaluate(() => {
      const root = document.body.cloneNode(true);
      root.querySelectorAll('svg, script, style, img').forEach((n) => n.remove());   // keep it small
      return root.innerHTML;
    });
    fs.writeFileSync(`inspect-dom-${name}.html`, html);
    console.log(`saved inspect-dom-${name}.html (${html.length} chars)`);
  }
  await browser.close();
})();
