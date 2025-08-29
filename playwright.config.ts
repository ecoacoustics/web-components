import { defineConfig, devices } from "@sand4rt/experimental-ct-web";

const isCi = !!process.env.CI;

export default defineConfig({
  testDir: "src",
  // we should aim to support fully parallel tests
  // however, it is possible that this breaks some tests down the line
  // (if we do not code good, isolated and independent tests)
  fullyParallel: false,
  // by enabling retries, playwright will automatically detect flaky tests
  // if we are running the tests locally, I want to disable retries so that
  // flakey tests are considered failures
  retries: isCi ? 3 : 0,
  // we start the vite server so that we can access the public/ directory
  // that contains audio files used in testing
  webServer: {
    command: "pnpm dev --port 3000",
  },
  // We do not fail in CI if there is an "only" because sometimes we want to use
  // focused tests when debugging a bug in CI.
  // If debugging a test in CI, I want to be able to use the CI exit code when
  // trying to see if the bug has been fixed.
  // Note that you will not be able to merge with a focused test because our
  // Playwright eslint rules will prevent the linting CI task from passing if
  // there is a focused test.
  forbidOnly: false,
  tsconfig: "tsconfig.json",
  use: {
    bypassCSP: true,
    ctViteConfig: {
      configFile: "vite.config.ts",
    },
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  reporter: process.env.PLAYWRIGHT_SHARD
    ? [
        ["blob"],
        ["github"],
      ]
    : [
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
        isCi ? ["github"] : ["list"],
      ],
  // be careful when updating this path template. Long path names can cause
  // Git on Windows to fail checkout
  snapshotPathTemplate: "./src/tests/__snapshots__/{arg}{ext}",
  testMatch: "**/*.spec.ts",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    // WebKit on Windows does not have AudioContext enabled.
    // see: https://github.com/microsoft/playwright/issues/14105
    // see: https://github.com/WebKit/webkit/blob/main/Source/cmake/OptionsWin.cmake#L100
    //
    // However, no one uses WebKit on Windows, so I'm not going to support it.
    // Both MacOS and Linux platforms do have webkit-based browsers
    // (Safari and Gnome Web) that are used often enough for me to justify
    // support.
    ...(process.platform !== "win32" && process.platform !== "linux"
      ? [
          {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
          },
        ]
      : []),
  ],
});
