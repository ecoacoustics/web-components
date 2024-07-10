import { defineConfig } from "@sand4rt/experimental-ct-web";

export default defineConfig({
  testDir: "src",
  // we should aim to support fully parallel tests
  // however, it is possible that this breaks some tests down the line
  // (if we do not code good, isolated and independent tests)
  fullyParallel: true,
  // by enabling retries, playwright will automatically detect flaky tests
  retries: 3,
  // we start the vite server so that we can access the public/ directory
  // that contains audio files used in testing
  webServer: {
    command: "pnpm dev --port 3000",
  },
  use: {
    bypassCSP: true,
    ctViteConfig: {
      configFile: "vite.config.ts",
    },
  },
  reporter: [
    // create a HTML report of the test results
    // this is the best way to debug why tests are failing locally
    ["html", { outputFolder: "test-report" }],
    // print the test results out to the console.
    // this can be useful for seeing why a test has failed in CI
    ["line"],
  ],
  snapshotPathTemplate: "./src/tests/__snapshots__/{testName}/{arg}{ext}",
});
