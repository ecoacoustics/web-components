import { getBrowserAttribute, getBrowserValue, setBrowserAttribute } from "../helpers";
import { Axes } from "axes/axes";
import { Spectrogram } from "../../components/spectrogram/spectrogram";
import { test } from "@sand4rt/experimental-ct-web";
import { Page } from "@playwright/test";

class TestPage {
  public constructor(public readonly page: Page) {}

  public axesComponent = () => this.page.locator("oe-axes").first();
  public spectrogramComponent = () => this.page.locator("oe-spectrogram").first();
  public xAxisTicks = () => this.page.locator("#x-axis-g line").all();
  public yAxisTicks = () => this.page.locator("#y-axis-g line").all();
  public xGridLines = () => this.page.locator("#x-gridlines-g line").all();
  public yGridLines = () => this.page.locator("#y-gridlines-g line").all();
  private audioSource = "/example.flac";

  // render window should be in the format x0, y0, x1, y1
  public async create(offset?: number, renderWindow?: string) {
    await this.page.setContent(`
      <oe-axes>
        <oe-spectrogram
          id="spectrogram"
          src="${this.audioSource}"
          ${offset ? `offset="${offset}"` : ""}
          ${renderWindow ? `window="${renderWindow}"` : ""}
        ></oe-spectrogram>
      </oe-axes>
    `);
    await this.page.waitForLoadState("networkidle");
  }

  public async changeSpectrogramSrc(src: string) {
    await setBrowserAttribute<Spectrogram>(this.spectrogramComponent(), "src", src);
  }

  public async xAxisLabels(): Promise<string[]> {
    const labelElements = await this.page.locator("#x-axis-g text").all();
    const labels: string[] = [];

    for (const labelElement of labelElements) {
      const labelContent = (await getBrowserValue(labelElement, "textContent")) as string;
      labels.push(labelContent);
    }

    return labels;
  }

  public async yAxisLabels(): Promise<string[]> {
    const labelElements = await this.page.locator("#y-axis-g text").all();
    const labels: string[] = [];

    for (const labelElement of labelElements) {
      const labelContent = (await getBrowserValue(labelElement, "textContent")) as string;
      labels.push(labelContent);
    }

    return labels;
  }

  public async xAxisStep(): Promise<number> {
    const attributeValue = await getBrowserAttribute<Axes>(this.axesComponent(), "x-step");

    // I use attributeValue here so that if the attribute is not present this function will return NaN
    // causing a test to fail
    // If I used parseInt, a non-present value would result in this function returning 0
    return Number(attributeValue);
  }

  public async yAxisStep(): Promise<number> {
    const attributeValue = await getBrowserAttribute<Axes>(this.axesComponent(), "y-step");
    return Number(attributeValue);
  }

  public async xTicksCount(): Promise<number> {
    const ticks = await this.xAxisTicks();
    return ticks.length;
  }
}

export const axesSpectrogramFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await fixture.create();
    await run(fixture);
  },
});
