import { Page } from "@playwright/test";
import { css, LitElement } from "lit";
import { removeStyleSheets } from "./remove";
import { addStyleSheets } from "./add";
import { createFixture, setContent } from "../../tests/fixtures";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-spectrogram").first();

  public async create() {
    await setContent(this.page, "<oe-spectrogram></oe-spectrogram>");

    await this.page.addScriptTag({
      content: removeStyleSheets.toString(),
    });

    await this.page.addScriptTag({
      content: addStyleSheets.toString(),
    });
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

export const stylesFixture = createFixture(TestPage);
