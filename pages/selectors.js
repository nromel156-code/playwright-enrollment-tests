// Selectors for https://uat.bcas-oasis.com/enrollment/form
// Steps 2-6 use the real `name` attributes found by inspect-form.js (Nov 15).
// Step 1 (Enrollment Details) has custom dropdowns WITHOUT usable names, so they are picked by their LABEL
// in EnrollmentFormPage.selectOption(). If that still fails, run `node inspect-dom.js` (see README).
module.exports = {
  privacyClose: 'button[aria-label="Close"]',
  nextBtn: 'button[aria-label="Next"]:visible',
  backBtn: 'button[aria-label="Back"]:visible',
  submitBtn: 'button[aria-label="Submit"]:visible',

  // Step 2 - Basic Student Information
  student: {
    lrn: 'input[name="basicInfo.learnerReferenceNumber"]',
    lastName: 'input[name="basicInfo.lastName"]',
    firstName: 'input[name="basicInfo.firstName"]',
    middleName: 'input[name="basicInfo.middleName"]',
    birthdate: 'input[name="basicInfo.birthdate"]',
    birthplace: 'input[name="basicInfo.birthplace"]',
    address: 'input[name="basicInfo.address"]',
    contact: 'input[name="basicInfo.contactNumber"]',
    religion: 'input[name="basicInfo.religion"]',
    facebook: 'input[name="basicInfo.facebookAccount"]',
    specialSkills: 'input[name="basicInfo.specialSkills"]',
  },

  // Step 3 - Relatives
  parents: {
    fatherName: 'input[name="relatives.father.name"]',
    fatherOccupation: 'input[name="relatives.father.occupation"]',
    fatherContact: 'input[name="relatives.father.contactNumber"]',
    fatherEmail: 'input[name="relatives.father.emailAddress"]',
    motherName: 'input[name="relatives.mother.name"]',
    motherOccupation: 'input[name="relatives.mother.occupation"]',
    motherContact: 'input[name="relatives.mother.contactNumber"]',
    motherEmail: 'input[name="relatives.mother.emailAddress"]',
    // aliases used by the data-driven tests (father fields)
    contact: 'input[name="relatives.father.contactNumber"]',
    email: 'input[name="relatives.father.emailAddress"]',
  },

  // Brothers and Sisters (inside the Relatives step). UNVERIFIED: the add-sibling form was not inspected yet.
  sibling: {
    addBtn: 'button[aria-label="Click Here to Add Sibling"]',
    name: 'input[name*="name" i]:visible',
    age: 'input[name*="age" i]:visible',
    occupation: 'input[name*="occupation" i]:visible',
    school: 'input[name*="school" i]:visible',
  },

  // Step 4 - School Last Attended
  school: {
    schoolName: 'input[name="schoolLastAttendeds[0].schoolName"]',
    schoolAddress: 'input[name="schoolLastAttendeds[0].schoolAddress"]',
    yearFrom: 'input[placeholder="yyyy"] >> nth=0',
    yearTo: 'input[placeholder="yyyy"] >> nth=1',
    graduated: 'input[name="schoolLastAttendeds[0].graduatedAt"]',
  },

  // Step 6 - Account Details
  account: {
    username: 'input[name="accountDetails.username"]',
    password: 'input[name="accountDetails.password"]',
    confirmPassword: 'input[name="accountDetails.confirmPassword"]',
  },
};
