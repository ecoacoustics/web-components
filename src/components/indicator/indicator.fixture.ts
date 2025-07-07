import { Page } from "@playwright/test";
import { waitForContentReady } from "../../tests/helpers";
import { createFixture, setContent } from "../../tests/fixtures";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-indicator").first();
  public indicatorLineElement = () => this.page.locator("#indicator-line").first();

  public async create() {
    // there is an inner element so that there is an element for the indicator to
    // wrap around. (notice that the element is not a spectrogram element)
    await setContent(
      this.page,
      `
        <oe-indicator>
          <div style="width: 200px; height: 200px;"></div>
        </oe-indicator>
    `,
    );
    await waitForContentReady(this.page, ["oe-indicator"]);
  }
}

export const indicatorFixture = createFixture(TestPage);
