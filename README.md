# BCAS-OASIS Enrollment Testing (Junior High School)

Automated and manual tests for the BCAS-OASIS UAT site (`https://uat.bcas-oasis.com`), prepared for the SQA Final Exam.

The project covers two areas:

- **Student side:** the Junior High School online enrollment form.
- **Admin side:** login, School Years settings (upload settings, Lock and Unlock) and the application list.

The automated tests are written in JavaScript with [Playwright Test](https://playwright.dev/docs/intro). Each test name begins with a Test Case ID (for example `TC-S13`) that matches the test case workbook in the `docs` folder.

---

## Group 3 (Junior High School)

1. LIWANAG, JUSTINE VINCENT DE OCAMPO
2. LONZAME, CARL JUSTIN LANDICHO
3. MANALO, CHRISTOPER EVANGELISTA
4. MENDOZA, NIÑO JUSTIN MANALO
5. MORGADO, REYNIEL IVAN BABADILLA
6. NAVARRO, ROMEL MILITSALA

---

## 1. Scope

| In scope | Out of scope |
|---|---|
| Junior High School enrollment form (all steps) | College, Senior High and Elementary enrollment |
| Admin login, School Years settings, Lock and Unlock | Subject selection (College only) |
| Application list and details (admin) | Performance and security testing |

The UAT site and the admin account are shared with other student groups. For this reason, every test is designed to be independent (see Section 6).

---

## 2. Prerequisites

- Node.js (LTS version)
- Visual Studio Code (recommended)
- The admin account credentials provided by the instructor
- A dedicated test school year for Junior High School (see Section 3)

---

## 3. Setup

1. Open the project folder (the folder that contains `package.json`) in a terminal and run:

   ```
   npm install
   npx playwright install chromium
   ```

2. Copy `.env.example` to `.env` and fill in the values:

   ```
   BASE_URL=https://uat.bcas-oasis.com
   ADMIN_USER=<admin username>
   ADMIN_PASS=<admin password>
   TEST_SCHOOL_YEAR=2027-2028
   SHARED_SCHOOL_YEAR=2026-2027
   ```

   The `.env` file is excluded by `.gitignore`. Credentials must never be committed to the repository.

3. Create a dedicated test school year (one time, manually):
   - Log in as admin, open **School Years**, and select **+ New**.
   - Choose Department = Junior High School and a school year that no other group uses (for example `2027-2028`).
   - Enter the same value in `.env` as `TEST_SCHOOL_YEAR`.

The admin tests refuse to run when `TEST_SCHOOL_YEAR` is empty or equal to the shared school year (`2026-2027`).

---

## 4. Running the tests

```
npx playwright test                  # all tests (headless)
npx playwright test --headed         # show the browser
npm run test:student                 # student form only
npm run test:admin                   # admin tests only
npx playwright test -g "TC-S13"      # one test by its Test Case ID
npx playwright show-report           # open the HTML report
```

Screenshots of failed tests are captured automatically and appear in the HTML report.

---

## 5. Test results (executed November 15, 2026)

| Spec file | Passed | Failed | Skipped |
|---|---|---|---|
| `tests/enrollment-form.spec.js` | 5 | 9 | 1 |
| `tests/admin-school-year.spec.js` | 9 | 0 | 0 |
| `tests/admin-enrollment-period.spec.js` | 0 | 0 | 2 |
| `tests/admin-applications.spec.js` | 0 | 1 | 0 |
| **Total (27 tests)** | **14** | **10** | **3** |

### 5.1 Failed tests that confirm application defects

These tests check the **expected** behavior. The application currently accepts invalid data, so the tests fail. Each failure is recorded in the Defect Log of the workbook.

| Test | Expected behavior | Defect |
|---|---|---|
| TC-S07 | Birthdate of today is rejected | DEF-001 |
| TC-S10 | Numbers in First Name are rejected | DEF-007 |
| TC-S11 | Special characters in First Name are rejected | DEF-014 |
| TC-S13 | Letters in Contact Number are rejected | DEF-004 |
| TC-S14 | A very short Contact Number is rejected | DEF-005 |
| TC-S15 | An LRN with fewer than 12 digits is rejected | DEF-006 |
| TC-S18 | An email without a domain is rejected | DEF-008 |
| TC-S25 | A graduation date in the future is rejected | DEF-011 |
| TC-S28 | A `.txt` file in the document upload is rejected | DEF-015 |

When one of these tests fails with "element not found" after clicking **Next**, the form has moved to the next step. This means the application accepted the invalid value.

### 5.2 Known limitations

- **TC-S30 / TC-A03 / TC-A04 / TC-A08** (`admin-applications.spec.js`): the end-to-end flow stops at the **Upload Documents** step. In the automated run, only two of the four documents kept their file. The same step worked in the manual run, so the cause (script or application) is not yet determined. It is recorded as an observation, not as a defect.
- **TC-S21** (negative sibling age) is marked `test.fixme` because the add-sibling form has not been inspected yet.
- **TC-A19 and TC-A20** (enrollment period dates) were skipped in automation and are covered by manual testing on the test school year only.

---

## 6. Test independence rules

The UAT site is shared, so the tests follow these rules:

- Every run creates new data with a unique `TEST-xxxx` name. Nothing is reused from an earlier run.
- No test depends on another test.
- Admin tests change **only** the school year in `TEST_SCHOOL_YEAR`, and every setting is restored after the check.
- After each admin test, the shared Junior High School 2026-2027 row is compared with its original state to confirm it was not changed.
- If the test school year is missing or locked by someone else, the admin tests are skipped with a reason instead of failing.
- Tests run one at a time (`workers: 1`).
- A test deletes only the record that carries its own `TEST-` name. If a test stops in the middle, the leftover `TEST-` record must be removed manually.
- The admin password exists only in the local `.env` file.

---

## 7. Form structure (observed on the real site)

The enrollment form has six steps:

1. Enrollment Details (Department, Grade/Level, School Year, Type)
2. Basic Student Information
3. Relatives (including Brothers and Sisters)
4. School Last Attended
5. Upload Documents
6. Account Details, then Submit

Step 1 uses custom dropdowns, selected by their label in `EnrollmentFormPage.selectOption()`. Steps 2 to 6 use the real `name` attributes defined in `pages/selectors.js`.

---

## 8. Project structure

```
playwright.config.js                   Test settings (1 worker, screenshot on failure, HTML report)
.env.example                           Template for the local .env file
helpers/env.js                         Reads .env and protects the shared school year
helpers/testData.js                    Unique TEST- data and sample files
pages/selectors.js                     Field selectors of the student form
pages/EnrollmentFormPage.js            Student form actions
pages/AdminPage.js                     Admin actions (login, school years, lock, checkboxes)
tests/enrollment-form.spec.js          Student form validation checks
tests/admin-school-year.spec.js        Admin login, upload settings, Lock and Unlock
tests/admin-enrollment-period.spec.js  Enrollment period checks (TC-A19, TC-A20)
tests/admin-applications.spec.js       Submit an application and verify it in the admin list
test-data/                             Sample files used for uploads
evidence/                              Screenshots of defects and test runs
docs/                                  Test plan, test cases, exploratory testing, defect log and execution report (Excel)
```

---

## 9. Troubleshooting

If a test reports "locator not found" or a timeout, the cause is usually a changed label or selector, not an application defect:

1. Run `npm run codegen`, click the field, and copy the selector that is shown.
2. Update it in `pages/selectors.js` (student form) or `pages/AdminPage.js` (admin).
3. Run the single test again with `npx playwright test -g "<Test Case ID>"`.

---

## 10. Documents

All test documentation is in the `docs` folder: the test plan, manual test cases, exploratory testing charters, the defect log, and the execution report. After each run, update the **Execution Report** (section G) and the **Status** and **Actual Result** columns of the Test Cases sheet.
