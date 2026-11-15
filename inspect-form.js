// inspect-form.js
// PURPOSE: list every field and button on the enrollment form, step by step,
//          so we can fix the selectors in pages/selectors.js.
// USAGE:   put this file next to package.json, then run:  node inspect-form.js
// SAFE:    it only READS the page. Do NOT click Submit on the last step.

const { chromium } = require('@playwright/test');
const readline = require('readline');
const fs = require('fs');

const OUT = 'inspect-output.txt';

// Wait for the user to press Enter in the terminal
function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Runs INSIDE the browser: collects fields, labels, buttons and headings
function collectPageInfo() {
  const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const isVisible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

  // Try every common way a label can be connected to an input
  const labelFor = (el) => {
    if (el.id) {
      const l = document.querySelector('label[for="' + el.id.replace(/"/g, '\\"') + '"]');
      if (l) return clean(l.textContent);
    }
    const wrap = el.closest('label');
    if (wrap) return clean(wrap.textContent);
    const by = el.getAttribute('aria-labelledby');
    if (by) {
      const text = by
        .split(' ')
        .map((id) => document.getElementById(id))
        .filter(Boolean)
        .map((n) => clean(n.textContent))
        .join(' ');
      if (text) return text;
    }
    return '';
  };

  const fields = [...document.querySelectorAll('input, select, textarea')].map((el) => ({
    tag: el.tagName.toLowerCase(),
    type: el.getAttribute('type') || '',
    name: el.getAttribute('name') || '',
    id: el.id || '',
    placeholder: el.getAttribute('placeholder') || '',
    ariaLabel: el.getAttribute('aria-label') || '',
    label: labelFor(el),
    visible: isVisible(el),
  }));

  const buttons = [...document.querySelectorAll('button, [role="button"]')].map((el) => ({
    text: clean(el.textContent),
    type: el.getAttribute('type') || '',
    ariaLabel: el.getAttribute('aria-label') || '',
    visible: isVisible(el),
  }));

  const labels = [...document.querySelectorAll('label')].map((e) => clean(e.textContent)).filter(Boolean);
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,legend')]
    .map((e) => clean(e.textContent))
    .filter(Boolean);

  return { url: location.href, headings, labels, fields, buttons };
}

// Turn the collected info into easy-to-read lines
function format(info, stepNo) {
  const lines = [];
  lines.push(`==================== STEP ${stepNo} ====================`);
  lines.push(`URL: ${info.url}`);
  lines.push(`HEADINGS: ${info.headings.join(' | ')}`);
  lines.push(`LABELS: ${info.labels.join(' | ')}`);
  lines.push('--- FIELDS ---');
  info.fields.forEach((f) => {
    lines.push(
      `visible=${f.visible ? 'yes' : 'no '} ${f.tag} type="${f.type}" label="${f.label}" ` +
        `placeholder="${f.placeholder}" aria-label="${f.ariaLabel}" name="${f.name}" id="${f.id}"`
    );
  });
  lines.push('--- BUTTONS ---');
  info.buttons.forEach((b) => {
    lines.push(`visible=${b.visible ? 'yes' : 'no '} text="${b.text}" aria-label="${b.ariaLabel}" type="${b.type}"`);
  });
  return lines.join('\n') + '\n\n';
}

(async () => {
  const browser = await chromium.launch({ headless: false }); // headed: you can see and use it
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('https://uat.bcas-oasis.com/enrollment/form');
  fs.writeFileSync(OUT, ''); // start with an empty output file

  let step = 1;
  while (true) {
    const answer = await ask(
      `\n[Step ${step}] In the browser, go to the step you want to scan (fill with FAKE data, do NOT submit).\n` +
        `Press Enter to scan this screen, or type q then Enter to finish: `
    );
    if (answer.trim().toLowerCase() === 'q') break;

    const info = await page.evaluate(collectPageInfo);
    const text = format(info, step);
    fs.appendFileSync(OUT, text);                       // save to file
    console.log(text);                                  // and show on screen
    await page.screenshot({ path: `inspect-step-${step}.png`, fullPage: true });
    console.log(`Saved to ${OUT} and inspect-step-${step}.png`);
    step++;
  }

  await browser.close();
  console.log(`\nDone. Send me the contents of ${OUT}.`);
})();
