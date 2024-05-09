import { Page } from "@playwright/test";
import { test } from "@sand4rt/experimental-ct-web";

class AxesFixture {
  public constructor(public readonly page: Page) {}

  public async create() {
    await this.page.setContent(`
      <oe-axes></oe-axes>
    `);
    await this.page.waitForLoadState("networkidle");
  }
}

export const axesFixture = test.extend<{ fixture: AxesFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new AxesFixture(page);
    await run(fixture);
  },
});
