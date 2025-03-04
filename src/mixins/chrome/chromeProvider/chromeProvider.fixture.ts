import { Page } from "@playwright/test";
import { test } from "../../../tests/assertions";
import { waitForContentReady } from "../../../tests/helpers";

class ChromeProviderFixture {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-tests-chrome-provider").first();
  public componentSlot = () => this.component().locator("slot").first();

  public async create(content = "") {
    await this.page.setContent(`
      <oe-tests-chrome-provider>${content}</oe-tests-chrome-provider>
    `);

    await waitForContentReady(this.page);
  }
}

export const chromeProviderFixture = test.extend<{ fixture: ChromeProviderFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new ChromeProviderFixture(page);
    await run(fixture);
  },
});
