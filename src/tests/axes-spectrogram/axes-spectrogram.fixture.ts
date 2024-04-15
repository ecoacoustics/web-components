import { test, Page } from "@playwright/test";
import { getBrowserAttribute } from "../helpers";
import { Axes } from "axes/axes";

class TestPage {
  public constructor(public readonly page: Page) {}

  public axesComponent = () => this.page.locator("oe-axes");
  public spectrogramComponent = () => this.page.locator("oe-spectrogram");

  public async create() {
    await this.page.setContent(`
      <oe-axes>
        <oe-spectrogram
          id="spectrogram"
        ></oe-spectrogram>
      </oe-axes>
    `);
  }

  public async xAxisStep(): Promise<number> {
    const attributeValue = await getBrowserAttribute<Axes>(this.axesComponent(), "x-step");

    // I use attributeValue here so that if the attribute is not present this function will return NaN
    // causing a test to fail
    // If I used parseInt, a non-present value would result in this funcition returning 0
    return Number(attributeValue);
  }

  public async yAxisStep(): Promise<number> {
    const attributeValue = await getBrowserAttribute<Axes>(this.axesComponent(), "y-step");
    return Number(attributeValue);
  }
}

export const axesSpectrogramFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await fixture.create();
    await run(fixture);
  },
});
