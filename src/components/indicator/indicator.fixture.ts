import { Page } from "@playwright/test";
import { test } from "@sand4rt/experimental-ct-web";
import { getBrowserValue } from "../../tests/helpers";
import { Indicator } from "./indicator";

class TestPage {
  public constructor(public readonly page: Page) {}

  public component = () => this.page.locator("oe-indicator");
  public indicatorLineElement = () => this.page.locator("#indicator-line");

  public async create() {
    await this.page.setContent(`
        <oe-indicator>
                <oe-spectrogram></oe-spectrogram>
        </oe-indicator>
    `);
    await this.page.waitForLoadState("networkidle");
  }

  public async play() {}

  public async pause() {}

  public async indicatorPosition(): Promise<number> {
    return await getBrowserValue<Indicator>(this.indicatorLineElement(), "xPos") as number;
  }
}

export const indicatorFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await fixture.create();
    await run(fixture);
  },
});
