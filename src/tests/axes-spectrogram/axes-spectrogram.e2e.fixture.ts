import { catchLocatorEvent, setBrowserAttribute, waitForContentReady } from "../helpers/helpers";
import { SpectrogramComponent } from "../../components/spectrogram/spectrogram";
import { Page } from "@playwright/test";
import { Size } from "../../models/rendering";
import { expect } from "../assertions";
import { createFixture, setContent } from "../fixtures";
import { SpectrogramCanvasScale } from "../../components/spectrogram/spectrogramOptions";

class TestPage {
  public constructor(public readonly page: Page) {}

  public axesComponent = () => this.page.locator("oe-axes").first();
  public spectrogramComponent = () => this.page.locator("oe-spectrogram").first();
  public xAxisTicks = () => this.page.locator("[part='tick x-tick']");
  public yAxisTicks = () => this.page.locator("[part='tick y-tick']");
  public xAxisLabels = () => this.page.locator("[part='label x-label']");
  public yAxisLabels = () => this.page.locator("[part='label y-label']");
  public xGridLines = () => this.page.locator("[part='x-grid'] line");
  public yGridLines = () => this.page.locator("[part='y-grid'] line");
  private audioSource = "http://localhost:3000/example.flac";

  // render window should be in the format x0, y0, x1, y1
  public async create(offset?: number, renderWindow?: string) {
    await setContent(
      this.page,
      `
      <oe-axes>
        <oe-spectrogram
          id="spectrogram"
          src="${this.audioSource}"
          ${offset ? `offset="${offset}"` : ""}
          ${renderWindow ? `window="${renderWindow}"` : ""}
        ></oe-spectrogram>
      </oe-axes>
    `,
    );
    await waitForContentReady(this.page, ["oe-axes", "oe-spectrogram"]);
  }

  // This create method is a hack to get around the fact that the ResizeObserver
  // callback runs asynchronously.
  // We need to wait unit the resize is complete before we can assert
  // the axes or size of the spectrogram. However, this is difficult to wait
  // during testing, so I use this hack to create a spectrogram with an initial
  // size instead of testing the resize.
  //
  // TODO: There should be a similar method that tests resizing the spectrogram
  // after initialization
  public async createWithSize(size: Readonly<Size>) {
    await setContent(
      this.page,
      `
      <oe-axes>
        <oe-spectrogram
          id="spectrogram"
          src="${this.audioSource}"
          style="width: ${size.width}px; height: ${size.height}px;"
        ></oe-spectrogram>
      </oe-axes>
    `,
    );
    await waitForContentReady(this.page, ["oe-axes", "oe-spectrogram"]);
  }

  public async spectrogramSize(): Promise<Size> {
    return await this.spectrogramComponent().evaluate((element) => {
      const { width, height } = element.getBoundingClientRect();
      return { width, height };
    });
  }

  public async changeSpectrogramSrc(src: string) {
    const targetSpectrogram = this.spectrogramComponent();

    const loadedEvent = catchLocatorEvent(targetSpectrogram, "loaded");
    await setBrowserAttribute<SpectrogramComponent>(this.spectrogramComponent(), "src", src);
    await loadedEvent;
  }

  public async changeSpectrogramScaling(value: SpectrogramCanvasScale) {
    await setBrowserAttribute<SpectrogramComponent>(this.spectrogramComponent(), "scaling", value);
  }

  public async xAxisStep(): Promise<number> {
    const firstValue = await this.xAxisLabels().nth(0).textContent();
    const secondValue = await this.xAxisLabels().nth(1).textContent();

    const step = Number(firstValue) - Number(secondValue);
    return Math.abs(step);
  }

  public async yAxisStep(): Promise<number> {
    const firstValue = await this.yAxisLabels().nth(0).textContent();
    const secondValue = await this.yAxisLabels().nth(1).textContent();
    const step = Number(firstValue) - Number(secondValue);
    return Math.abs(step);
  }

  public async xTicksCount(): Promise<number> {
    return await this.xAxisTicks().count();
  }

  public async assertAxisRange(xLow: string, xHigh: string, yLow: string, yHigh: string) {
    const xAxisLabels = this.xAxisLabels();
    const yAxisLabels = this.yAxisLabels();

    const firstXAxisLabel = xAxisLabels.nth(0);
    const lastXAxisLabel = xAxisLabels.nth(-1);
    const firstYAxisLabel = yAxisLabels.nth(0);
    const lastYAxisLabel = yAxisLabels.nth(-1);

    await expect(firstXAxisLabel).toHaveTrimmedText(xLow);
    await expect(lastXAxisLabel).toHaveTrimmedText(xHigh);
    await expect(firstYAxisLabel).toHaveTrimmedText(yLow);
    await expect(lastYAxisLabel).toHaveTrimmedText(yHigh);
  }
}

export const axesSpectrogramFixture = createFixture(TestPage);
