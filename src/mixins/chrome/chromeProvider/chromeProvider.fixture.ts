import { Page } from "@playwright/test";
import { waitForContentReady } from "../../../tests/helpers/helpers";
import { createFixture, setContent } from "../../../tests/fixtures";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-tests-chrome-provider").first();
  public componentSlot = () => this.component().locator("slot").first();

  public async create(content = "") {
    await setContent(this.page, `<oe-tests-chrome-provider>${content}</oe-tests-chrome-provider>`);

    await waitForContentReady(this.page);
  }
}

export const chromeProviderFixture = createFixture(TestPage);
