// Student side: Junior High School enrollment form (public page, no login).
// Test names start with the Test Case ID from the Excel file (traceability).
// NOTE: a test that FAILS here can be a real app bug. See the "defect" annotation in the report.
const { test, expect } = require('@playwright/test');
const { EnrollmentFormPage } = require('../pages/EnrollmentFormPage');
const sel = require('../pages/selectors');
const { validApplication, files, knownDefect, todayISO } = require('../helpers/testData');

// Counts the red "... is a required field" messages on screen.
// Used so a test cannot PASS only because the step was blocked by an empty field.
async function requiredMessageCount(page) {
  return page.getByText(/is a required field/i).count();
}

test.describe('Enrollment form - basic flow', () => {
  test('TC-S01 - Open enrollment form from the landing page', async ({ page }) => {
    const form = new EnrollmentFormPage(page);
    await form.openFromLanding();
    await expect(page.getByText('School Enrollment Form')).toBeVisible();
  });

  test('TC-S04 - Next is blocked when required student info is empty', async ({ page }) => {
    const form = new EnrollmentFormPage(page);
    await form.reachStep('student', validApplication()); // Step 1 done, now on Basic Student Information
    await form.next();                                    // nothing typed
    await form.expectStillOnStep(sel.student.firstName);
  });
});

// ---------------------------------------------------------------------------
// Data-driven negative / boundary checks.
// Each row = one test case. Expected result: the form must REJECT the value
// (we stay on the same step). Rows with a defect currently fail = confirmed bug.
// ---------------------------------------------------------------------------
const studentStepChecks = [
  { id: 'TC-S10', defect: 'DEF-007', title: 'numbers in first name', label: sel.student.firstName, value: '12345' },
  { id: 'TC-S11', defect: null,      title: 'special characters in first name', label: sel.student.firstName, value: `<>'"` },
  { id: 'TC-S15', defect: 'DEF-006', title: 'LRN with only 8 digits', label: sel.student.lrn, value: '10101010' },
];

test.describe('Enrollment form - student info validation', () => {
  for (const c of studentStepChecks) {
    test(`${c.id} - ${c.title} is rejected`, async ({ page }) => {
      if (c.defect) knownDefect(test, c.defect);
      const form = new EnrollmentFormPage(page);
      const app = validApplication();
      await form.reachStep('student', app);
      await form.fillStudent(app.student);
      await form.fill(c.label, c.value); // overwrite one field with the bad value
      await form.next();
      await form.expectStillOnStep(c.label);
    });
  }

  test('TC-S07 - Birthdate today is rejected', async ({ page }) => {
    knownDefect(test, 'DEF-001');
    const form = new EnrollmentFormPage(page);
    const app = validApplication();
    await form.reachStep('student', app);
    await form.fillStudent(app.student);
    await form.fillDate(sel.student.birthdate, todayISO());
    await form.next();
    await form.expectStillOnStep(sel.student.birthdate);
  });
});

const parentStepChecks = [
  { id: 'TC-S13', defect: 'DEF-004', title: 'letters in parent contact number', label: sel.parents.contact, value: 'hhhhhhhhhhS' },
  { id: 'TC-S14', defect: 'DEF-005', title: 'contact number too short (0000)', label: sel.parents.contact, value: '0000' },
  { id: 'TC-S17', defect: null,      title: 'email without @', label: sel.parents.email, value: '00000g' },
  { id: 'TC-S18', defect: 'DEF-008', title: 'email without domain (00000@g)', label: sel.parents.email, value: '00000@g' },
];

test.describe('Enrollment form - parents validation', () => {
  for (const c of parentStepChecks) {
    test(`${c.id} - ${c.title} is rejected`, async ({ page }) => {
      if (c.defect) knownDefect(test, c.defect);
      const form = new EnrollmentFormPage(page);
      const app = validApplication();
      await form.reachStep('parents', app);
      await form.fillParents(app.parents);
      await form.fill(c.label, c.value);
      await form.next();
      await form.expectStillOnStep(c.label);
    });
  }
});

test.describe('Enrollment form - siblings and school last attended', () => {
  // fixme: the add-sibling form was not inspected yet (selectors.sibling is a guess).
  // Remove .fixme after running `node inspect-dom.js`.
  test.fixme('TC-S21 - Negative sibling age is rejected', async ({ page }) => {
    knownDefect(test, 'DEF-009');
    const form = new EnrollmentFormPage(page);
    const app = validApplication();
    await form.reachStep('parents', app);
    await form.fillParents(app.parents);
    await form.fillSibling({ ...app.sibling, age: '-5' });
    await form.next();
    await form.expectStillOnStep(sel.sibling.age);
  });

  test('TC-S25 - Graduation date in the future is rejected', async ({ page }) => {
    knownDefect(test, 'DEF-011');
    const form = new EnrollmentFormPage(page);
    const app = validApplication();
    await form.reachStep('school', app);
    await form.fillSchool({ ...app.school, graduated: '03/31/2028' });
    await form.next();
    await page.waitForTimeout(500); // let any red messages appear
    // If a "required" message is on screen, the step was blocked by an empty field
    // (a script problem), NOT by the graduation date. Fail so it cannot be a false pass.
    expect(
      await requiredMessageCount(page),
      'Step was blocked by a required field (script problem), not by the graduation date'
    ).toBe(0);
    await form.expectStillOnStep(sel.school.graduated);
  });
});

test.describe('Enrollment form - documents', () => {
  test('TC-S26 - Next is blocked when no document is uploaded', async ({ page }) => {
    const form = new EnrollmentFormPage(page);
    const app = validApplication();
    await form.reachStep('documents', app, files.png);
    await form.next();
    // If Next was blocked we are still on the Upload Documents step,
    // so the document names are still on screen.
    await expect(page.getByText(/PSA Birth Certificate/i).first()).toBeVisible();
  });

  test('TC-S28 - A .txt file is rejected in document upload', async ({ page }) => {
    const form = new EnrollmentFormPage(page);
    const app = validApplication();
    await form.reachStep('documents', app, files.png);
    const removeButtons = page.getByRole('button', { name: /remove file/i });
    const before = await removeButtons.count();
    await form.uploadOneDocument(files.txt, 0);
    // The word "image" is always on this page ("type image"), so we do NOT search for it.
    // Rejected = no new file was added (no new "Remove File" button appears).
    await expect(removeButtons).toHaveCount(before);
  });
});

test.describe('Test data independence', () => {
  test('TC-A23 - Every run makes a different TEST- name', async () => {
    const a = validApplication().id;
    await new Promise((r) => setTimeout(r, 5));
    const b = validApplication().id;
    expect(a).toMatch(/^TEST-/);
    expect(a).not.toEqual(b);
  });
});