import { Page } from "@playwright/test";
import { test } from "../../tests/assertions";
import { waitForContentReady } from "../../tests/helpers";

class TestPage {
  public constructor(public readonly page: Page) {}

  public async create() {
    await this.page.setContent(``);
    await waitForContentReady(this.page);
  }

  public async createWithSlottedTags() {
    await this.page.setContent(``);
    await waitForContentReady(this.page);
  }

  public async createWithAttributeAndSlottedTags() {
    await this.page.setContent(``);
    await waitForContentReady(this.page);
  }
}

export const annotationFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await run(fixture);
  },
});
