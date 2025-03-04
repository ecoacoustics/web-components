import { Page } from "@playwright/test";
import { SpectrogramComponent } from "./spectrogram";
import { hasBrowserAttribute, setBrowserAttribute, waitForContentReady } from "../../tests/helpers";
import { test } from "../../tests/assertions";

class SingleSpectrogramFixture {
  public constructor(public readonly page: Page) {}

  public spectrogram = () => this.page.locator("oe-spectrogram").first();
  public spectrogramAudioElement = () => this.page.locator("oe-spectrogram #media-element").first();
  public mediaControls = () => this.page.locator("oe-media-controls").first();
  public mediaControlsActionButton = () => this.page.locator("oe-media-controls #action-button").first();
  public audioSource = "http://localhost:3000/example.flac";

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

  public async updateSlot(content: string) {
    const componentElement = this.spectrogram();
    await componentElement.evaluate((element: HTMLElement, content: string) => {
      element.innerHTML = content;
    }, content);
  }

  public async isPlayingAudio(): Promise<boolean> {
    return !(await hasBrowserAttribute<SpectrogramComponent>(this.spectrogram(), "paused"));
  }

  public async changeSpectrogramHeight(height = 512) {
    await this.page.evaluate((height) => {
      const spectrogram = document.querySelector("oe-spectrogram") as HTMLElement;
      spectrogram.style.height = `${height}px`;
    }, height);
  }

  public async changeSpectrogramWidth(width = 512) {
    await this.page.evaluate((width) => {
      const spectrogram = document.querySelector("oe-spectrogram") as HTMLElement;
      spectrogram.style.width = `${width}px`;
    }, width);
  }

  // we cannot use the SpectrogramCanvasScaling enum here because playwright
  // will throw an error during bundling and not run these tests
  public async changeSpectrogramSizing(sizing: string) {
    setBrowserAttribute<SpectrogramComponent>(this.spectrogram(), "scaling", sizing);
  }
}

export const singleSpectrogramFixture = test.extend<{ fixture: SingleSpectrogramFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new SingleSpectrogramFixture(page);
    await fixture.create();
    await run(fixture);
  },
});
