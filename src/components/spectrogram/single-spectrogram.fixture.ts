import { Page } from "@playwright/test";
import { SpectrogramComponent } from "./spectrogram";
import { hasBrowserAttribute, setBrowserAttribute, waitForContentReady } from "../../tests/helpers";
import { test } from "../../tests/assertions";
import { Size } from "../../models/rendering";
import { IChromeProvider } from "../../mixins/chrome/chromeProvider/chromeProvider";

class SingleSpectrogramFixture {
  public constructor(public readonly page: Page) {}

  public readonly spectrogram = () => this.page.locator("oe-spectrogram").first();
  public readonly spectrogramCanvas = () => this.page.locator("oe-spectrogram canvas").first();
  public readonly spectrogramAudioElement = () => this.page.locator("oe-spectrogram #media-element").first();
  public readonly chromeContainer = (selector: `chrome-${"top" | "bottom" | "left" | "right"}`) =>
    this.spectrogram().locator(`.${selector}`).first();

  public readonly mediaControls = () => this.page.locator("oe-media-controls").first();
  public readonly mediaControlsActionButton = () => this.page.locator("oe-media-controls #action-button").first();
  public readonly audioSource = "http://localhost:3000/example.flac";
  public readonly secondaryAudioSource = "http://localhost:3000/example2.flac";

  public async create() {
    // we se the spectrogram height to 632px so that the spectrogram is a nice
    // square shape in the snapshot tests
    await this.page.setContent(`
      <oe-spectrogram
        id="spectrogram"
        src="${this.audioSource}"
        style="position: relative; height: 632px;"
      ></oe-spectrogram>
      <oe-media-controls for="spectrogram"></oe-media-controls>
    `);
    await waitForContentReady(this.page, ["oe-spectrogram", "oe-media-controls"]);
  }

  public async createWithViewportSize() {
    await this.page.setContent(`
      <oe-spectrogram
        id="spectrogram"
        src="${this.audioSource}"
        style="position: relative; width: 100%; height: 100%;"
      ></oe-spectrogram>
      <oe-media-controls for="spectrogram"></oe-media-controls>
    `);
    await waitForContentReady(this.page, ["oe-spectrogram"]);
  }

  public async createWithDefaultSize() {
    await this.page.setContent(`<oe-spectrogram src="${this.audioSource}"></oe-spectrogram>`);
    await waitForContentReady(this.page, ["oe-spectrogram"]);
  }

  public async updateSlot(content: string) {
    const componentElement = this.spectrogram();
    await componentElement.evaluate((element: HTMLElement, content: string) => {
      element.innerHTML = content;
    }, content);
  }

  public async isPlayingAudio(): Promise<boolean> {
    return !(await hasBrowserAttribute<SpectrogramComponent>(this.spectrogram(), "paused"));
  }

  // we cannot use the SpectrogramCanvasScaling enum here because playwright
  // will throw an error during bundling and not run these tests
  public async changeSpectrogramSizing(sizing: string) {
    setBrowserAttribute<SpectrogramComponent>(this.spectrogram(), "scaling", sizing);
  }

  public async changeSpectrogramHeight(height = 704) {
    await this.spectrogram().evaluate((element: SpectrogramComponent, height) => {
      element.style.height = `${height}px`;
    }, height);
  }

  public async changeSpectrogramWidth(width = 512) {
    await this.spectrogram().evaluate((element: SpectrogramComponent, width) => {
      element.style.width = `${width}px`;
    }, width);
  }

  /**
   * Changes the spectrogram's canvas size (through css parts) without changing
   * the spectrogram host size.
   */
  public async changeCanvasSize(size: Size) {
    await this.spectrogram().evaluate((element: SpectrogramComponent) => {
      const styles = new CSSStyleSheet();
      styles.replaceSync(`
        :host *::part(canvas),
        :host::part(canvas) {
          width: ${size.width}px;
          height: ${size.height}px;
        }
      `);

      element.shadowRoot?.adoptedStyleSheets.push(styles);
    });
  }

  public async addChromeProvider(provider: IChromeProvider) {
    await this.spectrogram().evaluate((element: SpectrogramComponent, provider: IChromeProvider) => {
      // I use "as any" here because the chromeHost "connect" method is private
      // TODO: I should technically listen for the host chrome advertisement
      // event, but this works for now
      (element as any).connect(provider);
    }, provider);
  }
}

export const singleSpectrogramFixture = test.extend<{ fixture: SingleSpectrogramFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new SingleSpectrogramFixture(page);
    await run(fixture);
  },
});
