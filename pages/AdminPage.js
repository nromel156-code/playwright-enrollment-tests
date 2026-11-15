// Page object for the admin side (login, School Years, Admissions list).
const { expect } = require('@playwright/test');
const { config } = require('../helpers/env');

class AdminPage {
  constructor(page) {
    this.page = page;
  }

  // ---------- login ----------
  // Real login page (checked with inspect-login.js): input name="username", input name="password", button "Sign In".
  // The inputs are NOT linked to labels, so getByLabel does not work here.
  async login(username = config.adminUser, password = config.adminPass) {
    await this.page.goto('/auth/login');
    await this.page.locator('input[name="username"]').fill(username);
    await this.page.locator('input[name="password"]').fill(password);
    await this.page.getByRole('button', { name: /^sign in$/i }).click();
  }

  async expectLoggedIn() {
    await expect(this.page).not.toHaveURL(/auth\/login/);
  }

  // ---------- school years ----------
  async gotoSchoolYears() {
    // If we just clicked "Sign In", wait until the login finishes. Going to another page too early
    // cancels the login request, and the app sends us back to the login page.
    if (/auth\/login/.test(this.page.url())) {
      await this.page
        .waitForURL((u) => !/auth\/login/.test(u.pathname), { timeout: 15000 })
        .catch(() => {});
    }
    await this.page.goto('/school-years');
    await expect(this.page.getByText('School Years List')).toBeVisible();
  }

  row(department, schoolYear) {
    return this.page
      .getByRole('row')
      .filter({ hasText: department })
      .filter({ hasText: schoolYear })
      .first();
  }

  async rowExists(department, schoolYear) {
    // The list loads after the page opens, so WAIT for the row (up to 10 s) instead of counting right away.
    try {
      await this.row(department, schoolYear).waitFor({ state: 'visible', timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  async rowText(department, schoolYear) {
    return (await this.row(department, schoolYear).innerText()).replace(/\s+/g, ' ').trim();
  }

  async openRowMenu(department, schoolYear) {
    await this.row(department, schoolYear).getByRole('button').last().click(); // the 3 dots
  }

  async openEdit(department, schoolYear) {
    await this.openRowMenu(department, schoolYear);
    await this.page.getByText('Edit', { exact: true }).click();
    // Only the page title (heading). The "Update School Year" button also starts with "Update ", so getByText matched 2 things.
    await expect(this.page.getByRole('heading', { name: /^Update /i })).toBeVisible();
  }

  async lock(department, schoolYear) {
    await this.openRowMenu(department, schoolYear);
    await this.page.getByText('Lock', { exact: true }).click();
    await this.confirmIfAsked();
  }

  async unlock(department, schoolYear) {
    await this.openRowMenu(department, schoolYear);
    await this.page.getByText(/^Unlock$/).click();
    await this.confirmIfAsked();
  }

  async confirmIfAsked() {
    // Wait up to 3s for the dialog. (isVisible() alone does NOT wait, so it can miss a dialog that is still opening.)
    const confirm = this.page.getByRole('button', { name: /^(confirm|yes|ok|lock|unlock)$/i }).first();
    try {
      await confirm.waitFor({ state: 'visible', timeout: 3000 });
      await confirm.click();
    } catch {
      // no confirmation dialog on this action, that's fine
    }
    await this.page.waitForLoadState('networkidle');
  }

  // ---------- edit form: checkboxes ----------
  checkbox(label) {
    return this.page.getByLabel(label);
  }

  async openTerm(termName) {
    await this.page.getByText(termName, { exact: false }).first().click();
  }

  // Date inputs can be type="date" (YYYY-MM-DD) or plain text (MM/DD/YYYY).
  async setDate(input, iso) {
    const type = await input.getAttribute('type');
    if (type === 'date') return input.fill(iso);
    const [y, m, d] = iso.split('-');
    return input.fill(`${m}/${d}/${y}`);
  }

  // Enrollment Period inputs. Labels are a guess - fix the two regexes here after checking with codegen.
  enrollmentPeriod() {
    return {
      start: this.page.getByLabel(/enrollment.*(start|from)|(start|from).*enrollment/i).first(),
      end: this.page.getByLabel(/enrollment.*(end|to)\b|(end|to)\b.*enrollment/i).first(),
    };
  }

  async save() {
    await this.page.getByRole('button', { name: /save|update|submit/i }).last().click();
    // Let the save request finish before the test navigates away (otherwise the change may not be saved yet).
    await this.page.waitForLoadState('networkidle');
  }
}

// Independence guard used by every admin spec: if OUR school year is missing or was locked by someone else,
// we SKIP with a clear reason instead of failing (a failure would look like an app bug, but it is the environment).
async function requireCleanOwnSchoolYear(test, admin, department, schoolYear) {
  await admin.gotoSchoolYears();
  const exists = await admin.rowExists(department, schoolYear);
  test.skip(!exists, `Own school year "${department} ${schoolYear}" does not exist. Create it with "+ New" (see README step 2).`);
  const text = await admin.rowText(department, schoolYear);
  test.skip(/locked/i.test(text), `Own school year "${schoolYear}" is already Locked. Someone else changed it - unlock it by hand and re-run.`);
  return text;
}

module.exports = { AdminPage, requireCleanOwnSchoolYear };