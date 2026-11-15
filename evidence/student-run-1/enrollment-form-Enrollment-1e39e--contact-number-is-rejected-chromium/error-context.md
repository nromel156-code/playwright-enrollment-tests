# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: enrollment-form.spec.js >> Enrollment form - parents validation >> TC-S13 - letters in parent contact number is rejected
- Location: tests\enrollment-form.spec.js:76:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('input[name="relatives.father.contactNumber"]')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('input[name="relatives.father.contactNumber"]') with timeout 10000ms
  - waiting for locator('input[name="relatives.father.contactNumber"]')

```

```yaml
- link "app-logo":
  - /url: /landing
  - img "app-logo"
- list:
  - listitem:
    - link "Login":
      - /url: /auth/login
      - button "Login":  Login
- heading "School Enrollment Form" [level=3]
- button "1 Enrollment Details"
- button "2 Basic Student Information"
- button "3 Relatives"
- button "4 School Last Attended" [expanded]
- region "4 School Last Attended":
  - heading "Elementary" [level=5]
  - text: School Name*
  - textbox
  - text: School Address
  - textbox
  - text: Year From*
  - spinbutton "yyyy"
  - text: Year To*
  - spinbutton "yyyy"
  - text: Graduated At
  - combobox
  - button "Back":  Back
  - button "Next":  Next
- button "5 Upload Documents"
- button "6 Account Details"
- alert
```

# Test source

```ts
  1   | // Page object for the student enrollment form: https://uat.bcas-oasis.com/enrollment/form
  2   | // Steps: 1 Enrollment Details > 2 Basic Student Information > 3 Relatives (+ siblings) > 4 School Last Attended
  3   | //        > 5 Upload Documents > 6 Account Details > Submit
  4   | const { expect } = require('@playwright/test');
  5   | const sel = require('./selectors');
  6   | const { config } = require('../helpers/env');
  7   | 
  8   | class EnrollmentFormPage {
  9   |   constructor(page) {
  10  |     this.page = page;
  11  |   }
  12  | 
  13  |   // ---------- low-level helpers ----------
  14  |   async fill(selector, value) {
  15  |     if (value === undefined || value === '') return;
  16  |     await this.page.locator(selector).fill(String(value));
  17  |   }
  18  | 
  19  |   // Date fields are plain text inputs. UNVERIFIED format: MM/DD/YYYY (same as "Graduated At" in our manual tests).
  20  |   async fillDate(selector, iso) {
  21  |     const [y, m, d] = iso.split('-');
  22  |     const input = this.page.locator(selector);
  23  |     await input.fill(`${m}/${d}/${y}`);
  24  |     await input.press('Tab');   // the calendar pop-up closes and the typed date is committed
  25  |   }
  26  | 
  27  |   async next() {
  28  |     await this.page.locator(sel.nextBtn).first().click();
  29  |     await this.page.waitForTimeout(600); // step animation
  30  |   }
  31  | 
  32  |   async back() {
  33  |     await this.page.locator(sel.backBtn).first().click();
  34  |     await this.page.waitForTimeout(600);
  35  |   }
  36  | 
  37  |   async submit() {
  38  |     await this.page.locator(sel.submitBtn).first().click();
  39  |   }
  40  | 
  41  |   // "Rejected" = after clicking Next the field is still on screen (we did not move to another step).
  42  |   async expectStillOnStep(selector) {
> 43  |     await expect(this.page.locator(selector)).toBeVisible();
      |                                               ^ Error: expect(locator).toBeVisible() failed
  44  |   }
  45  | 
  46  |   // ---------- navigation ----------
  47  |   async dismissPrivacy() {
  48  |     const close = this.page.locator(sel.privacyClose).first();
  49  |     if (await close.isVisible({ timeout: 1500 }).catch(() => false)) await close.click();
  50  |   }
  51  | 
  52  |   async open() {
  53  |     await this.page.goto('/enrollment/form');
  54  |     await this.dismissPrivacy();
  55  |     await expect(this.page.getByText('School Enrollment Form')).toBeVisible();
  56  |   }
  57  | 
  58  |   async openFromLanding() {
  59  |     await this.page.goto('/landing');
  60  |     await this.page.getByRole('link', { name: /enroll now/i }).first().click();
  61  |     await expect(this.page).toHaveURL(/enrollment\/form/);
  62  |     await this.dismissPrivacy();
  63  |   }
  64  | 
  65  |   // ---------- Step 1: Enrollment Details (custom dropdowns, found by their LABEL) ----------
  66  |   // If something cannot be found, the page HTML is saved to debug-*.html so the selector can be fixed from the real DOM.
  67  |   async saveDebugHtml(name) {
  68  |     const html = await this.page.evaluate(() => {
  69  |       const root = document.body.cloneNode(true);
  70  |       root.querySelectorAll('svg, script, style, img').forEach((n) => n.remove());
  71  |       return root.innerHTML;
  72  |     });
  73  |     const file = `debug-${name.replace(/\W+/g, '-')}.html`;
  74  |     require('fs').writeFileSync(file, html);
  75  |     return file;
  76  |   }
  77  | 
  78  |   // Escape text so it can be used safely inside a RegExp
  79  |   static esc(text) {
  80  |     return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  81  |   }
  82  | 
  83  |   // Texts of everything that looks like an option in an open list.
  84  |   // Used only to write a CLEAR error message when an option cannot be chosen.
  85  |   async visibleOptionTexts() {
  86  |     return this.page.evaluate(() => {
  87  |       const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  88  |       const nodes = document.querySelectorAll(
  89  |         '[role="option"], [role="listbox"] li, [data-value], [class*="option" i], [class*="dropdown-item" i]'
  90  |       );
  91  |       const out = [];
  92  |       nodes.forEach((el) => {
  93  |         const t = (el.textContent || '').trim();
  94  |         if (t && t.length < 80 && visible(el) && !out.includes(t)) out.push(t);
  95  |       });
  96  |       return out.slice(0, 30);
  97  |     });
  98  |   }
  99  | 
  100 |   // Choose an option in one of the custom dropdowns of Step 1.
  101 |   // It tries 3 ways to OPEN the list, then looks for the option (exact text first, then partial text).
  102 |   // If it still fails, the error message lists the options that were really visible, and saves debug files.
  103 |   async selectOption(label, optionText) {
  104 |     const page = this.page;
  105 |     const exactRe = new RegExp(`^\\s*${EnrollmentFormPage.esc(optionText)}\\s*$`, 'i');
  106 |     const looseRe = new RegExp(EnrollmentFormPage.esc(optionText), 'i');
  107 | 
  108 |     // Find the label text, then take the FIRST arrow button / box that comes AFTER it in the page.
  109 |     // (Looking for "a div that holds the label and a button" was wrong: when all fields share one big div,
  110 |     //  it always clicked the FIRST dropdown - the Department one - for every label.)
  111 |     const lab = `(//*[text()[starts-with(normalize-space(.), "${label}")]])[1]`;
  112 |     const arrow = page.locator(`xpath=${lab}/following::button[1]`);
  113 |     const box = page.locator(
  114 |       `xpath=${lab}/following::*[self::input or @role="combobox" or @aria-haspopup][not(@type="radio") and not(@type="hidden")][1]`
  115 |     );
  116 | 
  117 |     // An option can be role=option, or just a visible element whose text matches
  118 |     const findOption = (re) =>
  119 |       page.getByRole('option', { name: re }).locator('visible=true')
  120 |         .or(page.getByText(re).locator('visible=true'))
  121 |         .first();
  122 | 
  123 |     // Three different ways to open the dropdown
  124 |     const openers = [
  125 |       ['arrow button', () => arrow.click({ timeout: 4000 })],
  126 |       ['click the box', () => box.click({ timeout: 4000, force: true })],
  127 |       ['keyboard', async () => {
  128 |         await box.focus({ timeout: 4000 });
  129 |         await page.keyboard.press('Alt+ArrowDown');
  130 |         await page.keyboard.press('ArrowDown');
  131 |       }],
  132 |     ];
  133 | 
  134 |     const tried = [];
  135 |     let seen = [];
  136 |     for (const [how, open] of openers) {
  137 |       await page.keyboard.press('Escape').catch(() => {});   // close a list left open by the previous try
  138 |       try {
  139 |         await open();
  140 |       } catch (e) {
  141 |         tried.push(`${how}: could not click`);
  142 |         continue;
  143 |       }
```