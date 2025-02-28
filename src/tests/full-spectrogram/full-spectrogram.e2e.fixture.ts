import { Page } from "@playwright/test";
import { SpectrogramComponent } from "../../components/spectrogram/spectrogram";
import {
  getBrowserAttribute,
  getBrowserSignalValue,
  getBrowserValue,
  setBrowserAttribute,
  waitForContentReady,
} from "../helpers";
import { AudioModel } from "../../models/recordings";
import { test } from "../assertions";

// this fixture involves all the components that we have developed interacting together
// in their expected use cases
class TestPage {
  public constructor(public readonly page: Page) {}

  public spectrogramComponent = () => this.page.locator("oe-spectrogram").first();
  public audioElement = () => this.page.locator("oe-spectrogram audio").first();

  public mediaControlsComponent = () => this.page.locator("oe-media-controls").first();
  public actionButton = () => this.page.locator("oe-media-controls #action-button").first();
  public actionButtonIcon = () => this.actionButton().locator("sl-icon").first();
  private audioSource = "http://localhost:3000/example.flac";

  public async create() {
    await this.page.setContent(`
      <oe-axes>
        <oe-indicator>
          <oe-spectrogram
            id="spectrogram"
            src="${this.audioSource}"
            offset="2"
            style="width: 200px; height: 200px;"
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
    const value = await getBrowserValue<SpectrogramComponent>(this.spectrogramComponent(), "paused");
    return !value as boolean;
  }

  public async audioPlaybackTime(): Promise<number> {
    return await getBrowserSignalValue<SpectrogramComponent, number>(this.spectrogramComponent(), "currentTime");
  }

  public async audioDuration(): Promise<number> {
    const audioModel = await getBrowserSignalValue<SpectrogramComponent, AudioModel>(
      this.spectrogramComponent(),
      "audio",
    );
    return audioModel.duration;
  }

  public async mediaControlsPlayIcon(): Promise<string> {
    return await getBrowserAttribute(this.actionButtonIcon(), "name");
  }

  public async changeSpectrogramSource(src: string) {
    await setBrowserAttribute<SpectrogramComponent>(this.spectrogramComponent(), "src", src);
  }
}

export const fullFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await fixture.create();
    await run(fixture);
  },
});
