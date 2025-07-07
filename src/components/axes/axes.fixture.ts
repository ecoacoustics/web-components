import { Page } from "@playwright/test";
import { waitForContentReady } from "../../tests/helpers";
import { createFixture } from "../../tests/fixtures";

class TestPage {
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

export const axesFixture = createFixture(TestPage);
