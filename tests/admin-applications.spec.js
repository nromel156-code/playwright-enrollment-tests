// Cross flow: student submits a TEST- application -> admin finds it -> admin checks Actions -> cleanup.
// Only the record with OUR unique TEST- name is ever opened or deleted.
const { test, expect } = require('@playwright/test');
const { EnrollmentFormPage } = require('../pages/EnrollmentFormPage');
const { AdminPage } = require('../pages/AdminPage');
const { validApplication, files } = require('../helpers/testData');
const { assertAdminCredentials } = require('../helpers/env');

test.describe('Admin - applications list', () => {
  test('TC-S30 / TC-A03 / TC-A04 / TC-A08 - Submitted application shows in admin list with the right data', async ({ page, browser }) => {
    assertAdminCredentials();
    const app = validApplication();

    // 1) Student submits (public page, no login)
    const form = new EnrollmentFormPage(page);
    await form.submitValidApplication(app, files.png);
    await expect(page.getByText(/success|submitted|thank/i).first()).toBeVisible();

    // 2) Admin looks for it (new browser context = fresh session)
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const admin = new AdminPage(adminPage);
    await admin.login();
    await admin.expectLoggedIn();
    await adminPage.getByRole('link', { name: /admission/i }).first().click();

    const row = adminPage.getByRole('row').filter({ hasText: new RegExp(app.id, 'i') }).first();
    try {
      await expect(row).toBeVisible();                                   // TC-A03
      await expect(row).toContainText(/Junior High School/i);            // TC-A04
      await expect(row).toContainText(/Grade 7/i);
      await expect(row).toContainText(/NEW/);

      await row.getByRole('button').last().click();                      // 3 dots
      await adminPage.getByText(/^(view|view details|details)$/i).first().click();   // exact match so we don't click things like "Overview"
      await adminPage.getByRole('button', { name: /actions/i }).click();
      for (const name of ['Verify', 'Edit', 'Download', 'Reject', 'Delete']) {   // TC-A08
        await expect(adminPage.getByText(name, { exact: true })).toBeVisible();
      }
    } finally {
      // 3) Cleanup: delete ONLY our own TEST- record
      if (await adminPage.getByText('Delete', { exact: true }).isVisible().catch(() => false)) {
        await adminPage.getByText('Delete', { exact: true }).click();
        const confirm = adminPage.getByRole('button', { name: /confirm|yes|delete/i }).last();
        try {
          await confirm.waitFor({ state: 'visible', timeout: 3000 });
          await confirm.click();
        } catch {
          // no confirm dialog
        }
      }
      await adminContext.close();
    }
  });
});
