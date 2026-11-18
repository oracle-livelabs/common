const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "../tests",
  outputDir: "../test-results",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  use: {
    baseURL: process.env.DASHBOARD_URL || "http://127.0.0.1:4175",
    browserName: "chromium",
    headless: true,
    viewport: { width: 1440, height: 1000 }
  }
});
