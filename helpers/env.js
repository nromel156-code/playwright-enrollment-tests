// Reads the .env file and protects the shared school year.
require('dotenv').config();

const config = {
  baseURL: process.env.BASE_URL || 'https://uat.bcas-oasis.com',
  adminUser: process.env.ADMIN_USER,
  adminPass: process.env.ADMIN_PASS,
  department: 'Junior High School',
  testSchoolYear: process.env.TEST_SCHOOL_YEAR,
  sharedSchoolYear: process.env.SHARED_SCHOOL_YEAR || '2026-2027',
};

// Independence rule: admin tests may only touch OUR test school year.
function assertSafeTestSchoolYear() {
  if (!config.testSchoolYear) {
    throw new Error('TEST_SCHOOL_YEAR is empty. Create your own JHS school year and put it in .env');
  }
  if (config.testSchoolYear === config.sharedSchoolYear) {
    throw new Error(`TEST_SCHOOL_YEAR (${config.testSchoolYear}) is the shared school year. Use your own.`);
  }
}

function assertAdminCredentials() {
  if (!config.adminUser || !config.adminPass) {
    throw new Error('ADMIN_USER or ADMIN_PASS is missing in .env');
  }
}

module.exports = { config, assertSafeTestSchoolYear, assertAdminCredentials };
