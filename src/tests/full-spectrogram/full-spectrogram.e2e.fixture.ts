import { Locator, Page } from "@playwright/test";
import { SpectrogramComponent } from "../../components/spectrogram/spectrogram";
import {
  catchLocatorEvent,
  getBrowserAttribute,
  getBrowserSignalValue,
  getBrowserValue,
  setBrowserAttribute,
  waitForContentReady,
} from "../helpers";
import { AudioModel } from "../../models/recordings";
import { test } from "../assertions";
import { Size } from "../../models/rendering";

// this fixture involves all the components that we have developed interacting together
// in their expected use cases
class TestPage {
  public constructor(public readonly page: Page) {}

  public spectrogramComponent = () => this.page.locator("oe-spectrogram").first();
  public audioElement = () => this.page.locator("oe-spectrogram audio").first();
  public canvasElement = () => this.page.locator("oe-spectrogram canvas").first();

  public mediaControlsComponent = () => this.page.locator("oe-media-controls").first();
  public actionButton = () => this.page.locator("oe-media-controls #action-button").first();
  public actionButtonIcon = () => this.actionButton().locator("sl-icon").first();
  private audioSource = "http://localhost:3000/example.flac";

  public chromeTopContainer = () => this.page.locator(".chrome-top").first();
  public chromeBottomContainer = () => this.page.locator(".chrome-bottom").first();
  public chromeLeftContainer = () => this.page.locator(".chrome-left").first();
  public chromeRightContainer = () => this.page.locator(".chrome-right").first();

  public async create() {
    await this.page.setContent(`
      <oe-axes>
        <oe-indicator>
          <oe-spectrogram
            id="spectrogram"
            src="${this.audioSource}"
          ></oe-spectrogram>
        </oe-indicator>
      </oe-axes>
      <oe-media-controls for="spectrogram"></oe-media-controls>
    `);
    await waitForContentReady(this.page, ["oe-axes", "oe-indicator", "oe-spectrogram", "oe-media-controls"]);
  }

  public async removeElement(selector: string) {
    const element = this.page.locator(selector).first();
    await element.evaluate((element) => element.remove());
  }

  public async shortcutPlaySpectrogram() {
    const target = this.spectrogramComponent();
    // Using the static property on the MediaControls component results in a
    // bundling error TypeError: Unknown file extension ".svg"
    // This error will only surface when using "pnpm test" and will not occur
    // when using "pnpm run test --ui"
    await target.press(" ");
  }

  public async playAudio() {
    const actionButtonElement = this.actionButton();
    await actionButtonElement.click();
  }

  public async pauseAudio() {
    const actionButtonElement = this.actionButton();
    await actionButtonElement.click();
  }

  public async isAudioPlaying(): Promise<boolean> {
    const value = await getBrowserValue<SpectrogramComponent, boolean>(this.spectrogramComponent(), "paused");
    return !value;
  }

  public async audioPlaybackTime(): Promise<number> {
    return await getBrowserSignalValue<SpectrogramComponent, number>(this.spectrogramComponent(), "currentTime");
  }

  public async audioDuration(): Promise<number> {
    const audioModel = await getBrowserSignalValue<SpectrogramComponent, AudioModel>(
      this.spectrogramComponent(),
      "audio" as any,
    );
    return audioModel.duration;
  }

  public async mediaControlsPlayIcon(): Promise<string> {
    return await getBrowserAttribute(this.actionButtonIcon(), "name");
  }

  public async changeSpectrogramSource(src: string) {
    const targetSpectrogram = this.spectrogramComponent();

    const loadedEvent = catchLocatorEvent(targetSpectrogram, "loaded");
    await setBrowserAttribute<SpectrogramComponent>(targetSpectrogram, "src", src);
    await loadedEvent;
  }

  public async getSpectrogramHostSize(): Promise<Readonly<Size>> {
    return await this.measureLocatorSize(this.spectrogramComponent());
  }

  public async getChromeSize(): Promise<Readonly<Size>> {
    const topSize = await this.measureLocatorSize(this.chromeTopContainer());
    const bottomSize = await this.measureLocatorSize(this.chromeBottomContainer());
    const leftSize = await this.measureLocatorSize(this.chromeLeftContainer());
    const rightSize = await this.measureLocatorSize(this.chromeRightContainer());

    return {
      width: leftSize.width + rightSize.width,
      height: topSize.height + bottomSize.height,
    };
  }

  public async getCanvasSize(): Promise<Readonly<Size>> {
    return await this.measureLocatorSize(this.canvasElement());
  }

  private async measureLocatorSize(element: Locator): Promise<Readonly<Size>> {
    const box = await element.boundingBox();
    if (!box) {
      throw new Error("Could not get the size of element");
    }

    return { width: box.width, height: box.height };
  }
}

export const fullFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await fixture.create();
    await run(fixture);
  },
});
