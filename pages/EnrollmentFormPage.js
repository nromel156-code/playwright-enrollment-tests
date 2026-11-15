// Page object for the student enrollment form: https://uat.bcas-oasis.com/enrollment/form
// Steps: 1 Enrollment Details > 2 Basic Student Information > 3 Relatives (+ siblings) > 4 School Last Attended
//        > 5 Upload Documents > 6 Account Details > Submit
const { expect } = require('@playwright/test');
const sel = require('./selectors');
const { config } = require('../helpers/env');

class EnrollmentFormPage {
  constructor(page) {
    this.page = page;
  }

  // ---------- low-level helpers ----------
  async fill(selector, value) {
    if (value === undefined || value === '') return;
    await this.page.locator(selector).fill(String(value));
  }

  // Date fields are plain text inputs. UNVERIFIED format: MM/DD/YYYY (same as "Graduated At" in our manual tests).
  async fillDate(selector, iso) {
    const [y, m, d] = iso.split('-');
    const input = this.page.locator(selector);
    await input.fill(`${m}/${d}/${y}`);
    await input.press('Tab');   // the calendar pop-up closes and the typed date is committed
  }

  async next() {
    await this.page.locator(sel.nextBtn).first().click();
    await this.page.waitForTimeout(600); // step animation
  }

  async back() {
    await this.page.locator(sel.backBtn).first().click();
    await this.page.waitForTimeout(600);
  }

  async submit() {
    await this.page.locator(sel.submitBtn).first().click();
  }

  // "Rejected" = after clicking Next the field is still on screen (we did not move to another step).
  async expectStillOnStep(selector) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  // ---------- navigation ----------
  async dismissPrivacy() {
    const close = this.page.locator(sel.privacyClose).first();
    if (await close.isVisible({ timeout: 1500 }).catch(() => false)) await close.click();
  }

  async open() {
    await this.page.goto('/enrollment/form');
    await this.dismissPrivacy();
    await expect(this.page.getByText('School Enrollment Form')).toBeVisible();
  }

  async openFromLanding() {
    await this.page.goto('/landing');
    await this.page.getByRole('link', { name: /enroll now/i }).first().click();
    await expect(this.page).toHaveURL(/enrollment\/form/);
    await this.dismissPrivacy();
  }

  // ---------- Step 1: Enrollment Details (custom dropdowns, found by their LABEL) ----------
  // If something cannot be found, the page HTML is saved to debug-*.html so the selector can be fixed from the real DOM.
  async saveDebugHtml(name) {
    const html = await this.page.evaluate(() => {
      const root = document.body.cloneNode(true);
      root.querySelectorAll('svg, script, style, img').forEach((n) => n.remove());
      return root.innerHTML;
    });
    const file = `debug-${name.replace(/\W+/g, '-')}.html`;
    require('fs').writeFileSync(file, html);
    return file;
  }

  // Escape text so it can be used safely inside a RegExp
  static esc(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Texts of everything that looks like an option in an open list.
  // Used only to write a CLEAR error message when an option cannot be chosen.
  async visibleOptionTexts() {
    return this.page.evaluate(() => {
      const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      const nodes = document.querySelectorAll(
        '[role="option"], [role="listbox"] li, [data-value], [class*="option" i], [class*="dropdown-item" i]'
      );
      const out = [];
      nodes.forEach((el) => {
        const t = (el.textContent || '').trim();
        if (t && t.length < 80 && visible(el) && !out.includes(t)) out.push(t);
      });
      return out.slice(0, 30);
    });
  }

  // Choose an option in one of the custom dropdowns of Step 1.
  // It tries 3 ways to OPEN the list, then looks for the option (exact text first, then partial text).
  // If it still fails, the error message lists the options that were really visible, and saves debug files.
  async selectOption(label, optionText) {
    const page = this.page;
    const exactRe = new RegExp(`^\\s*${EnrollmentFormPage.esc(optionText)}\\s*$`, 'i');
    const looseRe = new RegExp(EnrollmentFormPage.esc(optionText), 'i');

    // Find the label text, then take the FIRST arrow button / box that comes AFTER it in the page.
    // (Looking for "a div that holds the label and a button" was wrong: when all fields share one big div,
    //  it always clicked the FIRST dropdown - the Department one - for every label.)
    const lab = `(//*[text()[starts-with(normalize-space(.), "${label}")]])[1]`;
    const arrow = page.locator(`xpath=${lab}/following::button[1]`);
    const box = page.locator(
      `xpath=${lab}/following::*[self::input or @role="combobox" or @aria-haspopup][not(@type="radio") and not(@type="hidden")][1]`
    );

    // An option can be role=option, or just a visible element whose text matches
    const findOption = (re) =>
      page.getByRole('option', { name: re }).locator('visible=true')
        .or(page.getByText(re).locator('visible=true'))
        .first();

    // Three different ways to open the dropdown
    const openers = [
      ['arrow button', () => arrow.click({ timeout: 4000 })],
      ['click the box', () => box.click({ timeout: 4000, force: true })],
      ['keyboard', async () => {
        await box.focus({ timeout: 4000 });
        await page.keyboard.press('Alt+ArrowDown');
        await page.keyboard.press('ArrowDown');
      }],
    ];

    const tried = [];
    let seen = [];
    for (const [how, open] of openers) {
      await page.keyboard.press('Escape').catch(() => {});   // close a list left open by the previous try
      try {
        await open();
      } catch (e) {
        tried.push(`${how}: could not click`);
        continue;
      }
      // exact text first (1 s window is enough once the list is open), then partial text
      let option = findOption(exactRe);
      let shown = await option.waitFor({ state: 'visible', timeout: 2500 }).then(() => true).catch(() => false);
      if (!shown) {
        option = findOption(looseRe);
        shown = await option.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false);
      }
      if (!shown) {
        const now = await this.visibleOptionTexts();
        if (now.length) seen = now;   // keep the last NON-empty list so the error message is useful
        tried.push(`${how}: list opened but "${optionText}" is not in it`);
        continue;
      }
      try {
        await option.click({ timeout: 4000 });
      } catch {
        await option.click({ force: true, timeout: 4000 });
      }
      await option.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {});   // list closes after choosing
      await page.waitForTimeout(300);
      return;
    }

    // Everything failed: leave clear evidence
    const file = await this.saveDebugHtml(`open-${label}`);
    const png = file.replace(/\.html$/, '.png');
    await page.screenshot({ path: png }).catch(() => {});
    throw new Error(
      `Cannot choose "${optionText}" in the "${label}" dropdown.\n` +
      `Tried: ${tried.join(' | ')}\n` +
      `Options visible in the list: ${seen.length ? JSON.stringify(seen) : '(none - the list stayed empty or closed)'}\n` +
      `Debug files saved: ${file} and ${png} - send them.`
    );
  }

  // Uses OUR OWN school year (TEST_SCHOOL_YEAR), never the shared 2026-2027.
  async fillEnrollmentDetails({
    department = config.department,
    grade = 'Grade 7',
    schoolYear = config.testSchoolYear,
    type = 'NEW',
  } = {}) {
    await this.selectOption('Department', department);
    await this.selectOption('Grade/Level', grade);
    // Program (Regular / Sci-Math) may appear after the grade is chosen. Choose Regular if it does.
    const program = this.page.getByText(/^\s*Program\s*\*?\s*$/).first();
    if (await program.isVisible({ timeout: 1000 }).catch(() => false)) await this.selectOption('Program', 'Regular');
    await this.selectOption('School Year', schoolYear);
    await this.page.getByText(type, { exact: true }).click();
  }

  // ---------- Step 2: Basic Student Information ----------
  async fillStudent(s = {}) {
    const f = sel.student;
    await this.fill(f.lrn, s.lrn ?? '123456789012');
    await this.fill(f.lastName, s.lastName ?? 'TEST-Last');
    await this.fill(f.firstName, s.firstName ?? 'TEST-First');
    await this.fill(f.middleName, s.middleName);
    await this.page.getByText(s.sex === 'FEMALE' ? 'FEMALE' : 'MALE', { exact: true }).click();
    if (s.birthdate) await this.fillDate(f.birthdate, s.birthdate);
    await this.fill(f.birthplace, s.birthplace);
    await this.fill(f.address, s.address);
    await this.fill(f.contact, s.contact);
    await this.fill(f.religion, s.religion);
  }

  // ---------- Step 3: Relatives ----------
  async fillParents(p = {}) {
    const f = sel.parents;
    await this.fill(f.fatherName, p.fatherName ?? 'Test Father');
    await this.fill(f.fatherOccupation, p.occupation ?? 'Driver');
    await this.fill(f.fatherContact, p.contact ?? '09123456780');
    await this.fill(f.fatherEmail, p.email ?? 'father.test@example.com');
    await this.fill(f.motherName, p.motherName ?? 'Test Mother');
    await this.fill(f.motherOccupation, p.motherOccupation ?? 'Housewife');
    await this.fill(f.motherContact, p.motherContact ?? '09123456781');
    await this.fill(f.motherEmail, p.motherEmail ?? 'mother.test@example.com');
    await this.page.getByText('Mother', { exact: true }).click();   // Guardian = Mother
  }

  // UNVERIFIED: the add-sibling form was not inspected yet. Run inspect-dom.js with it open, then fix selectors.sibling.
  async fillSibling(s = {}) {
    await this.page.locator(sel.sibling.addBtn).click();
    await this.fill(sel.sibling.name, s.name);
    await this.fill(sel.sibling.age, s.age);
    await this.fill(sel.sibling.occupation, s.occupation);
    await this.fill(sel.sibling.school, s.school);
    const save = this.page.getByRole('button', { name: /^(save|add|submit|ok)$/i }).last();
    if (await save.isVisible({ timeout: 1500 }).catch(() => false)) await save.click();
  }

  // ---------- Step 4: School Last Attended ----------
  // The "yyyy" year fields behave like date pickers: a plain fill() is not saved ("Year From is a required field").
  // They need REAL key presses and a blur (Tab). If typing does not stick, we pick the year in the pop-up instead.
  async fillYear(selector, year) {
    const input = this.page.locator(selector);
    await input.click();
    await input.fill('').catch(() => {});                       // clear it (ignored if the box is read-only)
    await input.pressSequentially(String(year), { delay: 60 });  // real key presses
    await input.press('Tab');                                    // blur: the page saves the typed year
    if ((await input.inputValue()).trim() === String(year)) return;

    // Fallback: open the picker and click the year
    await input.click();
    await this.page.getByText(String(year), { exact: true }).locator('visible=true').first().click({ timeout: 4000 });
    await input.press('Tab').catch(() => {});
    const now = (await input.inputValue()).trim();
    if (!now.includes(String(year))) {
      await this.page.screenshot({ path: `debug-year-${year}.png` }).catch(() => {});
      throw new Error(`Could not set the year "${year}" in ${selector}. Value now: "${now}". Screenshot: debug-year-${year}.png - send it.`);
    }
  }

  async fillSchool(s = {}) {
    const f = sel.school;
    await this.fill(f.schoolName, s.schoolName ?? 'Test Elementary School');
    await this.fill(f.schoolAddress, s.schoolAddress ?? 'Lipa City');
    await this.fillYear(f.yearFrom, s.yearFrom ?? '2019');
    await this.fillYear(f.yearTo, s.yearTo ?? '2025');
    // Graduated At is OPTIONAL and uses a calendar pop-up: type it, then Tab so the pop-up closes
    const graduated = s.graduated ?? '03/31/2026';
    if (graduated) {
      await this.fill(f.graduated, graduated);
      await this.page.locator(f.graduated).press('Tab');
    }
  }

  // ---------- Step 5: Upload Documents ----------
  // The form shows 4 "Upload" buttons (SF 9 / Report Card, Report Card, PSA Birth Certificate, Student Picture).
  // Clicking one opens the file chooser, so we answer the chooser. (Falls back to a plain <input type=file> if one exists.)
  uploadButtons() {
    return this.page.getByRole('button', { name: /^\s*upload\s*$/i });
  }

  // After a successful upload the document shows its file name and a red "Remove File" button.
  removeFileButtons() {
    return this.page.getByRole('button', { name: /remove file/i });
  }

  // uniqueName = true: send the SAME image under a DIFFERENT file name each time (document-<time>.png).
  // Used when uploading all 4 documents, in case the app mixes up files that share one name.
  async uploadOneDocument(file, index = 0, uniqueName = false) {
    const fs = require('fs');
    const path = require('path');
    let payload = file;
    if (uniqueName) {
      const ext = path.extname(file);
      payload = {
        name: `${path.basename(file, ext)}-${Date.now()}${ext}`,
        mimeType: ext.toLowerCase() === '.png' ? 'image/png' : 'application/octet-stream',
        buffer: fs.readFileSync(file),
      };
    }
    const [chooser] = await Promise.all([
      this.page.waitForEvent('filechooser', { timeout: 8000 }),
      this.uploadButtons().nth(index).click(),
    ]);
    await chooser.setFiles(payload);
    await this.page.waitForTimeout(700);   // let the page process the file
  }

  // FIX: the "Upload" button does NOT disappear right away (the app waits until the upload finishes), so counting
  // buttons made the script skip documents (only SF 9 and PSA were uploaded). Now we always click the FIRST
  // remaining Upload button and WAIT until one more "Remove File" button appears before doing the next document.
  async uploadAllDocuments(file) {
    const inputs = this.page.locator('input[type="file"]');
    if (await inputs.count()) {
      for (let i = 0; i < (await inputs.count()); i++) await inputs.nth(i).setInputFiles(file);
      return;
    }
    const removeBtn = this.removeFileButtons();
    for (let round = 0; round < 8; round++) {          // safety limit
      if ((await this.uploadButtons().count()) === 0) return;   // every document has a file
      const doneBefore = await removeBtn.count();
      await this.uploadOneDocument(file, 0, true);
      await expect(
        removeBtn,
        `Document upload #${round + 1} did not finish (no new "Remove File" button appeared)`
      ).toHaveCount(doneBefore + 1, { timeout: 15000 });
    }
  }

  // ---------- Step 6: Account Details ----------
  async fillAccount(a = {}) {
    await this.fill(sel.account.username, a.username);
    await this.fill(sel.account.password, a.password);
    await this.fill(sel.account.confirmPassword, a.password);
  }

  // Short red-looking messages currently on screen (e.g. "Birthdate is a required field").
  async visibleMessages() {
    return this.page.evaluate(() => {
      const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      const re = /required|invalid|must|please|error|not allowed|too (short|long)|only/i;
      const out = [];
      document.querySelectorAll('body *').forEach((el) => {
        if (el.children.length) return;                       // only the innermost elements
        const t = (el.textContent || '').trim();
        if (t && t.length < 120 && re.test(t) && visible(el) && !out.includes(t)) out.push(t);
      });
      return out.slice(0, 15);
    });
  }

  // Click Next and make sure we REALLY moved on. If not, say WHY, so a stuck script is never mistaken for an app bug
  // (and a test like "bad data is rejected" can never pass just because the step was blocked for another reason).
  async advance({ arrive, leave, label }) {
    await this.next();
    const ok = arrive
      ? await this.page.locator(arrive).first().waitFor({ state: 'visible', timeout: 6000 }).then(() => true).catch(() => false)
      : await this.page.locator(leave).first().waitFor({ state: 'hidden', timeout: 6000 }).then(() => true).catch(() => false);
    if (ok) return;
    const messages = await this.visibleMessages();
    await this.page.screenshot({ path: `debug-stuck-${label.replace(/\W+/g, '-')}.png` }).catch(() => {});
    throw new Error(
      `Could not leave the "${label}" step with VALID data. This is a SCRIPT problem, not an app bug.\n` +
      `Messages on screen: ${messages.length ? JSON.stringify(messages) : '(none)'}\n` +
      `Screenshot saved: debug-stuck-${label.replace(/\W+/g, '-')}.png - send it.`
    );
  }

  // ---------- flows ----------
  // Go to a step by filling the earlier steps with VALID data. stepName: student | parents | school | documents | account
  // Siblings are skipped on the way (assumed optional - UNVERIFIED), except when stepName === 'siblings'.
  async reachStep(stepName, app, files) {
    await this.open();
    await this.fillEnrollmentDetails();
    await this.advance({ arrive: sel.student.firstName, label: 'Enrollment Details' });
    if (stepName === 'student') return;
    await this.fillStudent(app.student);
    await this.advance({ arrive: sel.parents.fatherName, label: 'Basic Student Information' });
    if (stepName === 'parents' || stepName === 'siblings') return;
    await this.fillParents(app.parents);
    await this.advance({ arrive: sel.school.schoolName, label: 'Relatives' });
    if (stepName === 'school') return;
    await this.fillSchool(app.school);
    await this.advance({ leave: sel.school.schoolName, label: 'School Last Attended' });
    if (stepName === 'documents') return;
    await this.uploadAllDocuments(files);
    await this.advance({ arrive: sel.account.username, label: 'Upload Documents' });
  }

  async submitValidApplication(app, files) {
    await this.reachStep('account', app, files);
    await this.fillAccount(app.account);
    await this.submit();
  }
}

module.exports = { EnrollmentFormPage };