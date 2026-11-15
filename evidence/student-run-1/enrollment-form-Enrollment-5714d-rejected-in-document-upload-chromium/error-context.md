# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: enrollment-form.spec.js >> Enrollment form - documents >> TC-S28 - A .txt file is rejected in document upload
- Location: tests\enrollment-form.spec.js:132:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('button', { name: /remove file/i })
Expected: 0
Received: 1
Timeout:  10000ms

Call log:
  - Expect "toHaveCount" getByRole('button', { name: /remove file/i }) with timeout 10000ms
  - waiting for getByRole('button', { name: /remove file/i })
    23 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - link [ref=e4] [cursor=pointer]:
        - /url: /landing
        - img "app-logo" [ref=e5]
      - text: 
      - list [ref=e7] [cursor=pointer]:
        - listitem [ref=e8]:
          - link [ref=e9]:
            - /url: /auth/login
            - button "Login" [ref=e10]:
              - generic: 
    - generic [ref=e13]:
      - heading "School Enrollment Form" [level=3] [ref=e14]
      - generic [ref=e15]:
        - button "1 Enrollment Details" [ref=e18]:
          - generic [ref=e20]:
            - generic [ref=e21]: "1"
            - generic [ref=e22]: Enrollment Details
        - button "2 Basic Student Information" [ref=e25]:
          - generic [ref=e27]:
            - generic [ref=e28]: "2"
            - generic [ref=e29]: Basic Student Information
        - button "3 Relatives" [ref=e32]:
          - generic [ref=e34]:
            - generic [ref=e35]: "3"
            - generic [ref=e36]: Relatives
        - button "4 School Last Attended" [ref=e39]:
          - generic [ref=e41]:
            - generic [ref=e42]: "4"
            - generic [ref=e43]: School Last Attended
        - generic [ref=e44]:
          - button "5 Upload Documents" [expanded] [ref=e46]:
            - generic [ref=e48]:
              - generic [ref=e49]: "5"
              - generic [ref=e50]: Upload Documents
          - region "5 Upload Documents" [ref=e51]:
            - generic [ref=e52]:
              - generic [ref=e58]:
                - generic [ref=e60]:
                  - generic [ref=e61]:
                    - generic [ref=e62]: SF 9 / Report Card*
                    - generic [ref=e63]: "required: yes"
                    - generic [ref=e64]: "type: image"
                  - generic [ref=e65]:
                    - generic [ref=e66]: not-allowed.txt
                    - button "Remove File" [ref=e67] [cursor=pointer]:
                      - generic: 
                - generic [ref=e69]:
                  - generic [ref=e70]:
                    - generic [ref=e71]: Report Card *
                    - generic [ref=e72]: "required: yes"
                    - generic [ref=e73]: "type: image"
                  - button "Upload" [ref=e75] [cursor=pointer]:
                    - generic: 
                - generic [ref=e78]:
                  - generic [ref=e79]:
                    - generic [ref=e80]: PSA Birth Certificate *
                    - generic [ref=e81]: "required: yes"
                    - generic [ref=e82]: "type: image"
                  - button "Upload" [ref=e84] [cursor=pointer]:
                    - generic: 
                - generic [ref=e87]:
                  - generic [ref=e88]:
                    - generic [ref=e89]: Student Picture *
                    - generic [ref=e90]: "required: yes"
                    - generic [ref=e91]: "type: image"
                  - button "Upload" [ref=e93] [cursor=pointer]:
                    - generic: 
              - generic [ref=e95]:
                - button "Back" [ref=e96] [cursor=pointer]:
                  - generic: 
                - button "Next" [ref=e98] [cursor=pointer]:
                  - generic: 
        - button "6 Account Details" [ref=e102]:
          - generic [ref=e104]:
            - generic [ref=e105]: "6"
            - generic [ref=e106]: Account Details
  - alert [ref=e107]
```

# Test source

```ts
  41  | test.describe('Enrollment form - student info validation', () => {
  42  |   for (const c of studentStepChecks) {
  43  |     test(`${c.id} - ${c.title} is rejected`, async ({ page }) => {
  44  |       if (c.defect) knownDefect(test, c.defect);
  45  |       const form = new EnrollmentFormPage(page);
  46  |       const app = validApplication();
  47  |       await form.reachStep('student', app);
  48  |       await form.fillStudent(app.student);
  49  |       await form.fill(c.label, c.value); // overwrite one field with the bad value
  50  |       await form.next();
  51  |       await form.expectStillOnStep(c.label);
  52  |     });
  53  |   }
  54  | 
  55  |   test('TC-S07 - Birthdate today is rejected', async ({ page }) => {
  56  |     knownDefect(test, 'DEF-001');
  57  |     const form = new EnrollmentFormPage(page);
  58  |     const app = validApplication();
  59  |     await form.reachStep('student', app);
  60  |     await form.fillStudent(app.student);
  61  |     await form.fillDate(sel.student.birthdate, todayISO());
  62  |     await form.next();
  63  |     await form.expectStillOnStep(sel.student.birthdate);
  64  |   });
  65  | });
  66  | 
  67  | const parentStepChecks = [
  68  |   { id: 'TC-S13', defect: 'DEF-004', title: 'letters in parent contact number', label: sel.parents.contact, value: 'hhhhhhhhhhS' },
  69  |   { id: 'TC-S14', defect: 'DEF-005', title: 'contact number too short (0000)', label: sel.parents.contact, value: '0000' },
  70  |   { id: 'TC-S17', defect: null,      title: 'email without @', label: sel.parents.email, value: '00000g' },
  71  |   { id: 'TC-S18', defect: 'DEF-008', title: 'email without domain (00000@g)', label: sel.parents.email, value: '00000@g' },
  72  | ];
  73  | 
  74  | test.describe('Enrollment form - parents validation', () => {
  75  |   for (const c of parentStepChecks) {
  76  |     test(`${c.id} - ${c.title} is rejected`, async ({ page }) => {
  77  |       if (c.defect) knownDefect(test, c.defect);
  78  |       const form = new EnrollmentFormPage(page);
  79  |       const app = validApplication();
  80  |       await form.reachStep('parents', app);
  81  |       await form.fillParents(app.parents);
  82  |       await form.fill(c.label, c.value);
  83  |       await form.next();
  84  |       await form.expectStillOnStep(c.label);
  85  |     });
  86  |   }
  87  | });
  88  | 
  89  | test.describe('Enrollment form - siblings and school last attended', () => {
  90  |   // fixme: the add-sibling form was not inspected yet (selectors.sibling is a guess).
  91  |   // Remove .fixme after running `node inspect-dom.js`.
  92  |   test.fixme('TC-S21 - Negative sibling age is rejected', async ({ page }) => {
  93  |     knownDefect(test, 'DEF-009');
  94  |     const form = new EnrollmentFormPage(page);
  95  |     const app = validApplication();
  96  |     await form.reachStep('parents', app);
  97  |     await form.fillParents(app.parents);
  98  |     await form.fillSibling({ ...app.sibling, age: '-5' });
  99  |     await form.next();
  100 |     await form.expectStillOnStep(sel.sibling.age);
  101 |   });
  102 | 
  103 |   test('TC-S25 - Graduation date in the future is rejected', async ({ page }) => {
  104 |     knownDefect(test, 'DEF-011');
  105 |     const form = new EnrollmentFormPage(page);
  106 |     const app = validApplication();
  107 |     await form.reachStep('school', app);
  108 |     await form.fillSchool({ ...app.school, graduated: '03/31/2028' });
  109 |     await form.next();
  110 |     await page.waitForTimeout(500); // let any red messages appear
  111 |     // If a "required" message is on screen, the step was blocked by an empty field
  112 |     // (a script problem), NOT by the graduation date. Fail so it cannot be a false pass.
  113 |     expect(
  114 |       await requiredMessageCount(page),
  115 |       'Step was blocked by a required field (script problem), not by the graduation date'
  116 |     ).toBe(0);
  117 |     await form.expectStillOnStep(sel.school.graduated);
  118 |   });
  119 | });
  120 | 
  121 | test.describe('Enrollment form - documents', () => {
  122 |   test('TC-S26 - Next is blocked when no document is uploaded', async ({ page }) => {
  123 |     const form = new EnrollmentFormPage(page);
  124 |     const app = validApplication();
  125 |     await form.reachStep('documents', app, files.png);
  126 |     await form.next();
  127 |     // If Next was blocked we are still on the Upload Documents step,
  128 |     // so the document names are still on screen.
  129 |     await expect(page.getByText(/PSA Birth Certificate/i).first()).toBeVisible();
  130 |   });
  131 | 
  132 |   test('TC-S28 - A .txt file is rejected in document upload', async ({ page }) => {
  133 |     const form = new EnrollmentFormPage(page);
  134 |     const app = validApplication();
  135 |     await form.reachStep('documents', app, files.png);
  136 |     const removeButtons = page.getByRole('button', { name: /remove file/i });
  137 |     const before = await removeButtons.count();
  138 |     await form.uploadOneDocument(files.txt, 0);
  139 |     // The word "image" is always on this page ("type image"), so we do NOT search for it.
  140 |     // Rejected = no new file was added (no new "Remove File" button appears).
> 141 |     await expect(removeButtons).toHaveCount(before);
      |                                 ^ Error: expect(locator).toHaveCount(expected) failed
  142 |   });
  143 | });
  144 | 
  145 | test.describe('Test data independence', () => {
  146 |   test('TC-A23 - Every run makes a different TEST- name', async () => {
  147 |     const a = validApplication().id;
  148 |     await new Promise((r) => setTimeout(r, 5));
  149 |     const b = validApplication().id;
  150 |     expect(a).toMatch(/^TEST-/);
  151 |     expect(a).not.toEqual(b);
  152 |   });
  153 | });
```