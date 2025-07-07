import { Page } from "@playwright/test";
import { waitForContentReady } from "../../../tests/helpers";
import { createFixture } from "../../../tests/fixtures";

class TestPage {
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

export const chromeProviderFixture = createFixture(TestPage);
