// Admin side: Enrollment Period of OUR OWN test school year (TC-A19, TC-A20).
// INDEPENDENCE: only TEST_SCHOOL_YEAR is edited, original dates are always put back, shared 2026-2027 is only read.
const { test, expect } = require('@playwright/test');
const { AdminPage, requireCleanOwnSchoolYear } = require('../pages/AdminPage');
const { config, assertSafeTestSchoolYear, assertAdminCredentials } = require('../helpers/env');

const DEPT = config.department;
const MINE = config.testSchoolYear;
const SHARED = config.sharedSchoolYear;

test.describe('Admin - enrollment period (own test school year only)', () => {
  let admin, sharedBefore;

  test.beforeAll(() => {
    assertSafeTestSchoolYear();
    assertAdminCredentials();
  });

  test.beforeEach(async ({ page }) => {
    sharedBefore = undefined;
    admin = new AdminPage(page);
    await admin.login();
    await requireCleanOwnSchoolYear(test, admin, DEPT, MINE);
    sharedBefore = await admin.rowText(DEPT, SHARED);
  });

  test.afterEach(async () => {
    if (sharedBefore === undefined) return;
    await admin.gotoSchoolYears();
    expect(await admin.rowText(DEPT, SHARED)).toEqual(sharedBefore);
  });

  // Edit -> set start/end -> save. Returns the ORIGINAL raw values so the caller can restore them.
  async function setPeriod(startIso, endIso) {
    await admin.openEdit(DEPT, MINE);
    const { start, end } = admin.enrollmentPeriod();
    test.skip(!(await start.count()) || !(await end.count()),
      'Enrollment Period inputs not found. Check the labels with `npm run codegen` and fix AdminPage.enrollmentPeriod().');
    const original = { start: await start.inputValue(), end: await end.inputValue() };
    await admin.setDate(start, startIso);
    await admin.setDate(end, endIso);
    await admin.save();
    return original;
  }

  async function restore(original) {
    await admin.gotoSchoolYears();
    await admin.openEdit(DEPT, MINE);
    const { start, end } = admin.enrollmentPeriod();
    await start.fill(original.start);
    await end.fill(original.end);
    await admin.save();
  }

  test('TC-A19 - Enrollment period in the past: status is no longer "Enrollment is ongoing"', async () => {
    let original;
    try {
      original = await setPeriod('2020-06-01', '2020-06-30');
      await admin.gotoSchoolYears();
      expect(await admin.rowText(DEPT, MINE)).not.toMatch(/Enrollment is ongoing/i);
    } finally {
      if (original) await restore(original);
    }
  });

  test('TC-A20 - Enrollment period with end date before start date is rejected', async () => {
    let original;
    try {
      original = await setPeriod('2027-06-30', '2027-06-01');   // end < start on purpose
      await admin.gotoSchoolYears();
      await admin.openEdit(DEPT, MINE);
      const { start, end } = admin.enrollmentPeriod();
      const saved = { start: await start.inputValue(), end: await end.inputValue() };
      // Rejected = the reversed dates were NOT saved, so after reload we still see the original dates.
      expect(saved).toEqual(original);
    } finally {
      if (original) await restore(original);
    }
  });
});
