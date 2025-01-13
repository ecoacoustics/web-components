import { Page } from "@playwright/test";
import { test } from "../../tests/assertions";
import { waitForContentReady } from "../../tests/helpers";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-tag").first();

  public async create(content: string) {
    await this.page.setContent(content);
    await waitForContentReady(this.page);
  }
}

export const tagsFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await run(fixture);
  },
});
