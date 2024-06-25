import { Page } from "@playwright/test";
import { test } from "@sand4rt/experimental-ct-web";
import { getBrowserValue } from "../../tests/helpers";
import { IndicatorComponent } from "./indicator";
import { Size } from "../../models/rendering";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-indicator").first();
  public indicatorLineElement = () => this.page.locator("#indicator-line").first();

  public async create() {
    // there is an inner element so that there is an element for the indicator to
    // wrap around. (notice that the element is not a spectrogram element)
    await this.page.setContent(`
        <oe-indicator>
          <div style="width: 200px; height: 200px;"></div>
        </oe-indicator>
    `);
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector("oe-indicator");
  }

  public async indicatorPosition(): Promise<number> {
    return (await getBrowserValue<IndicatorComponent>(this.indicatorLineElement(), "xPos")) as number;
  }

  public async indicatorSize(): Promise<Size> {
    const width = (await getBrowserValue<IndicatorComponent>(this.component(), "clientWidth")) as number;
    const height = (await getBrowserValue<IndicatorComponent>(this.component(), "clientHeight")) as number;
    return { width, height };
  }
}

export const indicatorFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await fixture.create();
    await run(fixture);
  },
});
