// Admin side: login, School Years, upload settings, Lock / Unlock.
// INDEPENDENCE: these tests only change OUR test school year (TEST_SCHOOL_YEAR in .env).
// The shared JHS 2026-2027 is only READ, never changed. Every change is put back at the end.
const { test, expect } = require('@playwright/test');
const { AdminPage, requireCleanOwnSchoolYear } = require('../pages/AdminPage');
const { config, assertSafeTestSchoolYear, assertAdminCredentials } = require('../helpers/env');

const DEPT = config.department;
const MINE = config.testSchoolYear;
const SHARED = config.sharedSchoolYear;

test.describe('Admin - login', () => {
  test('TC-A01 - Login with a valid admin account', async ({ page }) => {
    assertAdminCredentials();
    const admin = new AdminPage(page);
    await admin.login();
    await admin.expectLoggedIn();
  });

  test('TC-A02 - Login with a username that does not exist is rejected', async ({ page }) => {
    // Fake username on purpose, so the real sqa_admin account is never locked.
    const admin = new AdminPage(page);
    await admin.login('no-such-user-xyz', 'WrongPass123');
    await expect(page).toHaveURL(/auth\/login/);
  });
});

test.describe('Admin - school year settings (own test school year only)', () => {
  let admin;
  let sharedBefore;
  let mineBefore;

  test.beforeAll(() => {
    assertSafeTestSchoolYear();
    assertAdminCredentials();
  });

  test.beforeEach(async ({ page }) => {
    sharedBefore = undefined;   // reset, so a skipped test never reuses an old snapshot
    mineBefore = undefined;
    admin = new AdminPage(page);
    await admin.login();
    mineBefore = await requireCleanOwnSchoolYear(test, admin, DEPT, MINE);   // skip (not fail) if env was changed by others
    sharedBefore = await admin.rowText(DEPT, SHARED);   // snapshot of the shared row (read only)
  });

  // After EVERY test: the shared school year must be exactly the same as before.
  test.afterEach(async () => {
    if (sharedBefore === undefined) return;   // test was skipped by the guard, nothing to compare
    await admin.gotoSchoolYears();
    expect(await admin.rowText(DEPT, SHARED)).toEqual(sharedBefore);
    // Our own row must also be back to how we found it (every test puts its change back).
    expect.soft(await admin.rowText(DEPT, MINE), 'own school year was not restored').toEqual(mineBefore);
  });

  test('TC-A10 - School Years list shows JHS 2026-2027 with period and status', async () => {
    const text = await admin.rowText(DEPT, SHARED);
    expect(text).toMatch(/Nov \d+, 2026/);
    expect(text).toMatch(/Enrollment is ongoing|Locked|classes started/i);
  });

  // One helper for the 4 checkbox tests: flip -> save -> reload -> check -> flip back -> save.
  async function flipSetting(label, { term } = {}) {
    await admin.openEdit(DEPT, MINE);
    if (term) await admin.openTerm(term);
    const box = admin.checkbox(label);
    const original = await box.isChecked();

    await box.setChecked(!original);
    await admin.save();

    await admin.gotoSchoolYears();                    // reload from the list
    await admin.openEdit(DEPT, MINE);
    if (term) await admin.openTerm(term);
    try {
      expect(await admin.checkbox(label).isChecked()).toBe(!original);   // saved?
    } finally {
      await admin.checkbox(label).setChecked(original);                  // always put it back
      await admin.save();
    }
  }

  test('TC-A13 / TC-A17 - Attendance Upload can be turned off/on and is saved', async () => {
    await flipSetting('Is Attendance Upload Enabled');
  });

  test('TC-A14 - Grade Upload (First Term) can be turned off/on and is saved', async () => {
    await flipSetting('Is Grade Upload Enabled', { term: 'FIRST TERM' });
  });

  test('TC-A15 - Character Grade Upload can be turned on/off and is saved', async () => {
    await flipSetting('Is Character Grade Upload Enabled');
  });

  test('TC-A16 - Disable Report Card Downloads can be turned on/off and is saved', async () => {
    await flipSetting('Disable Report Card Downloads for Students');
  });

  test('TC-A18 - Lock shows a Locked tag and Unlock removes it', async () => {
    await admin.lock(DEPT, MINE);
    try {
      await expect(admin.row(DEPT, MINE)).toContainText(/locked/i);
    } finally {
      await admin.gotoSchoolYears();
      if (/locked/i.test(await admin.rowText(DEPT, MINE))) await admin.unlock(DEPT, MINE);
    }
    await admin.gotoSchoolYears();
    await expect(admin.row(DEPT, MINE)).not.toContainText(/locked/i);
  });

  test('TC-A22 - Shared JHS school year is not changed (guard)', async () => {
    assertSafeTestSchoolYear();
    expect(MINE).not.toEqual(SHARED);
    expect(await admin.rowText(DEPT, SHARED)).toEqual(sharedBefore);
  });
});
