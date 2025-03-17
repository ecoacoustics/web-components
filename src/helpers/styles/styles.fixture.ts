import { Page } from "@playwright/test";
import { test } from "../../tests/assertions";
import { css, LitElement } from "lit";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-spectrogram").first();

  public async create() {
    await this.page.setContent("<oe-spectrogram></oe-spectrogram>");
  }

  public getComponentStyleSheets() {
    return this.component().evaluate((el) => el.shadowRoot?.adoptedStyleSheets);
  }

  // TODO: we should test on a real component, but I can't seem to figure out
  // how to get the tested functions (addStyleSheets, removeStyleSheets) to
  // cross the browser/node boundary
  public generateFakeElement(): LitElement {
    class FakeElement {
      public shadowRoot = {
        // prettier-ignore
        adoptedStyleSheets: [
          css`:host { color: red; }`,
          css`:host { background-color: blue; }`,
          css`:host { fill: green; }`,
        ],
      };
    }

    return new FakeElement() as any;
  }
}

export const stylesFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await run(fixture);
  },
});
