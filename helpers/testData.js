// Test data. Every run makes a NEW unique TEST- name, so our records never mix with other groups.

function uniqueId() {
  return `TEST-${Date.now().toString(36).toUpperCase()}`;
}

function validApplication(id = uniqueId()) {
  return {
    id,
    student: {
      firstName: 'Juan',
      lastName: id,                // unique value goes in the last name so it is easy to search
      middleName: '',
      birthdate: '2014-03-15',     // about 12 years old, fits Grade 7
      birthplace: 'Lipa City',
      address: 'Test Street, Lipa City, Batangas',
      contact: '09123456789',
      religion: 'Catholic',
      lrn: '123456789012',         // 12 digits
    },
    parents: {
      fatherName: 'Test Father',
      occupation: 'Driver',
      contact: '09123456780',
      email: 'father.test@example.com',
    },
    sibling: { name: 'Test Sibling', age: '8', occupation: 'Student', school: 'Test Elementary' },
    school: { schoolName: 'Test Elementary School', schoolAddress: 'Lipa City', yearFrom: '2019', yearTo: '2025', graduated: '03/31/2026' },
    // The form creates a student login, so the username must be new on every run (independence).
    account: { username: `test_${id.replace('TEST-', '').toLowerCase()}`, password: 'Test@1234' },
  };
}

// Today's date as YYYY-MM-DD in Philippine time.
// (new Date().toISOString() is UTC, so before 8:00 AM in the Philippines it returns YESTERDAY.)
function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

// 1x1 pixel PNG, used as a fake picture of a document.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

const files = {
  png: { name: 'document.png', mimeType: 'image/png', buffer: TINY_PNG },
  txt: { name: 'not-allowed.txt', mimeType: 'text/plain', buffer: Buffer.from('this is not an image') },
};

// Add the defect ID to the report so a failing test is linked to our Defect Log.
function knownDefect(test, defectId) {
  test.info().annotations.push({ type: 'defect', description: defectId });
}

module.exports = { uniqueId, validApplication, files, knownDefect, todayISO };
