# Playwright tests - BCAS-OASIS UAT (Junior High School enrollment)

SQA Final Exam. Tests the **student enrollment form** and the **admin side** (School Years settings).
Test names start with the **Test Case ID** from `SQA_Final_Exam_Enrollment_Testing.xlsx`.

---

## 1. Setup (one time)

1. Install **Node.js** (LTS) and **VS Code**.
2. Open this folder in VS Code, then open the Terminal and run:

```
npm install
npx playwright install chromium
```

3. Copy `.env.example` to `.env` and fill in:
   - `ADMIN_USER` and `ADMIN_PASS` (from sir)
   - `TEST_SCHOOL_YEAR` = **your own** JHS school year (see step 2)

> `.env` is in `.gitignore`. Never upload your password to GitHub.

## 2. Make your OWN test school year (one time, by hand)

Why: sir said our tests must be independent. If we lock or edit **JHS 2026-2027**, enrollment stops for every group.

1. Login as admin, go to **School Years**, click **+ New**.
2. Department = Junior High School, School Year = something nobody uses (example `2027-2028`), fill the required fields.
3. Put the same school year in `.env` as `TEST_SCHOOL_YEAR`.
4. Tell the other groups which school year is yours.

The scripts **refuse to run** the admin tests if `TEST_SCHOOL_YEAR` is empty or equal to `2026-2027`.

## 3. Run

```
npx playwright test                 # everything (headless)
npx playwright test --headed        # see the browser
npm run test:student                # student form only
npm run test:admin                  # admin only
npx playwright show-report          # open the HTML report
```

Screenshots of failed tests are saved automatically in the report.

## 4. IMPORTANT: check the selectors first

The scripts were written from screenshots, **before they could be run on the real site**. Field labels or button names may be a little different.

If a test says *"locator not found"* or *"timeout"*:
1. Run `npm run codegen` and click the field. Copy the label that codegen shows.
2. Fix it in **`pages/selectors.js`** (student form) or **`pages/AdminPage.js`** (admin). You do not need to change the tests.
3. Run that single test again: `npx playwright test -g "TC-S13"`

Things most likely to need a small fix: the Save button name, the date field format, the Add Sibling button, the Unlock menu name, the Admissions menu link, the Delete confirmation button.

### 4b. Real form structure (found Nov 15 with inspect-form.js)

6 steps: 1 Enrollment Details (Department, Grade/Level, School Year, Type) > 2 Basic Student Information > 3 Relatives (+ Brothers and Sisters) > 4 School Last Attended > 5 Upload Documents > 6 Account Details > Submit.
Steps 2-6 use the real `name` attributes (pages/selectors.js). Step 1 uses custom dropdowns, picked by their label in `EnrollmentFormPage.selectOption()`.
Still UNVERIFIED: the date format of Birthdate (we type MM/DD/YYYY), the add-sibling form (so TC-S21 is `test.fixme`), the success message after Submit.
If a dropdown or the sibling form still fails, run `node inspect-dom.js`, open the dropdown / sibling form in the browser, type a name in the terminal, and send the saved `inspect-dom-*.html` file.

## 5. Failing tests are NOT always script errors

A failed test is a question, not a verdict. These tests check the **correct** behavior, and the app currently accepts bad data, so these are expected to fail until the app is fixed:

| Test | Defect |
|---|---|
| TC-S07 birthdate today | DEF-001 |
| TC-S10 numbers in first name | DEF-007 |
| TC-S13 letters in contact number | DEF-004 |
| TC-S14 contact number too short | DEF-005 |
| TC-S15 LRN 8 digits | DEF-006 |
| TC-S18 email without domain | DEF-008 |
| TC-S21 negative sibling age | DEF-009 |
| TC-S25 future graduation date | DEF-011 |

Each one has a `defect` tag in the HTML report. If one of them fails with *"locator not found"* instead of a wrong-behavior message, that is a selector problem (step 4), not the bug.

## 5b. Admin tests that were written BEFORE exploring the screen

`admin-enrollment-period.spec.js` (TC-A19, TC-A20) uses **guessed labels**. If the label is not found the test is **skipped with a reason**, not failed. Do the exploratory charter EXP-05 (Excel, sheet Exploratory Testing) first, then fix `AdminPage.enrollmentPeriod()`.

## 6. Independence rules (sir's instruction)

- Every run makes a new unique name `TEST-xxxx`. Nothing is reused from an earlier run.
- No test needs another test to run first.
- Admin tests change **only** our own `TEST_SCHOOL_YEAR`, and put each setting back after the check.
- After every admin test, the script checks that the shared **JHS 2026-2027** row is exactly the same as before.
- If our own school year is missing or was Locked by someone else, the admin tests are **skipped with a reason** (they do not fail and look like app bugs).
- After every admin test, our own school year row is also compared with how we found it.
- `workers: 1` - one test at a time, because the UAT site is shared.
- The admin password is only in `.env`.
- The test only deletes the record with its own `TEST-` name. If a test fails in the middle, delete the leftover `TEST-` record by hand.

## 7. Files

```
playwright.config.js          settings (1 worker, screenshot on failure, HTML report)
.env.example                  copy to .env
helpers/env.js                reads .env + guard for the shared school year
helpers/testData.js           unique TEST- data, fake files
pages/selectors.js            labels of the student form (fix here)
pages/EnrollmentFormPage.js   student form actions
pages/AdminPage.js            admin actions (login, school years, lock, checkboxes)
tests/enrollment-form.spec.js         student form checks
tests/admin-school-year.spec.js       admin login + school year settings + lock
tests/admin-enrollment-period.spec.js TC-A19, TC-A20 (own school year dates)
tests/admin-applications.spec.js      student submits -> admin sees it -> cleanup
```

## 8. After running

Write the results in the Excel file: **Execution Report > section G** (tests run, passed, failed) and update the **Status** / **Actual Result** in the Test Cases sheet.
