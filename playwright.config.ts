import { defineConfig } from "@sand4rt/experimental-ct-web";

export default defineConfig({
  testDir: "src",
  // we should aim to support fully parallel tests
  // however, it is possible that this breaks some tests down the line
  // (if we do not code good, isolated and independent tests)
  fullyParallel: false,
  // by enabling retries, playwright will automatically detect flaky tests
  retries: 3,
  // we start the vite server so that we can access the public/ directory
  // that contains audio files used in testing
  webServer: {
    command: "pnpm dev --port 3000",
  },
  // Fail in CI if there is a focused test.only
  forbidOnly: !!process.env.CI,
  use: {
    bypassCSP: true,
    ctViteConfig: {
      configFile: "vite.config.ts",
    },
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  reporter: [
    // create a HTML report of the test results
    // this is the best way to debug why tests are failing locally
    [
      "html",
      {
        outputFolder: "test-report",
        open: "never",
      },
    ],
    // print the test results out to the console.
    // this can be useful for seeing why a test has failed in CI
    process.env.CI ? ["github"] : ["list"],
  ],
  snapshotPathTemplate: "./src/tests/__snapshots__/{testName}/{arg}{ext}",
  testMatch: "**/*.spec.ts",
  projects: [{ name: "chromium" }, { name: "firefox" }, { name: "webkit" }],
});
