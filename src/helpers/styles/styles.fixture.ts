import { Page } from "@playwright/test";
import { test } from "../../tests/assertions";
import { CSSResultGroup } from "lit";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-spectrogram").first();

  public async create() {
    await this.page.setContent(`<oe-spectrogram></oe-spectrogram>`);
  }

  public async getComponentStyleSheets() {
    return this.component().evaluate((element) => {
      return element.shadowRoot?.adoptedStyleSheets;
    });
  }

  public async removeStyleSheets(styles: CSSResultGroup) {}

  public async addStyleSheets(styles: CSSResultGroup) {}
}

export const stylesFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await run(fixture);
  },
});
