import { test } from "@sand4rt/experimental-ct-web";
import { expect } from "./assertions";

test.describe("Test Bed", () => {
  // since SharedArrayBuffer requires additional headers and permissions
  // this test asserts the test bed is correctly set up to use SharedArrayBuffer
  test("SharedArrayBuffer should be defined", async ({ page }) => {
    const result = await page.evaluate(() => typeof SharedArrayBuffer);
    expect(result).toBe("function");
  });
});
