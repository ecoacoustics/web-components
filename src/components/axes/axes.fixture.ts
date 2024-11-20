import { Page } from "@playwright/test";
import { test } from "../../tests/assertions";
import { waitForContentReady } from "../../tests/helpers";

class AxesFixture {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-axes").first();
  public innerContent = () => this.page.getByTestId("inner-content");

  public async create() {
    await this.page.setContent(`
      <oe-axes>
        <div data-testid="inner-content"></div>
      </oe-axes>
    `);
    await waitForContentReady(this.page, ["oe-axes"]);
  }
}

export const axesFixture = test.extend<{ fixture: AxesFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new AxesFixture(page);
    await run(fixture);
  },
});
