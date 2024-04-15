import { expect } from "@sand4rt/experimental-ct-web";
import { indicatorFixture } from "./indicator.fixture";

indicatorFixture.describe("Indicator inter-component communication", () => {
  indicatorFixture.beforeEach(async ({ fixture }) => {
    await fixture.create();
  });

  indicatorFixture("creating a visible web component", async ({ page }) => {
          const indicator = await page.locator("oe-indicator");
          await expect(indicator).toBeVisible();
  });
});
