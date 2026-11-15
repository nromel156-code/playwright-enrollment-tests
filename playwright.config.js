// @ts-check
const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // UAT is shared with other groups, so we run ONE test at a time and never in parallel.
  fullyParallel: false,
  workers: 1,
  retries: 0,

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.BASE_URL || 'https://uat.bcas-oasis.com',
    actionTimeout: 10_000,       // a wrong selector fails in 10 s with a clear message, not after 60 s
    screenshot: 'only-on-failure',   // evidence for the report
    trace: 'retain-on-failure',
    video: 'off',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
