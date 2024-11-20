import { Page } from "@playwright/test";
import { SpectrogramComponent } from "./spectrogram";
import { hasBrowserAttribute, waitForContentReady } from "../../tests/helpers";
import { test } from "../../tests/assertions";

class SingleSpectrogramFixture {
  public constructor(public readonly page: Page) {}

  public spectrogram = () => this.page.locator("oe-spectrogram").first();
  public spectrogramAudioElement = () => this.page.locator("oe-spectrogram #media-element").first();
  public mediaControls = () => this.page.locator("oe-media-controls").first();
  public mediaControlsActionButton = () => this.page.locator("oe-media-controls #action-button").first();
  public audioSource = "http://localhost:3000/example.flac";

  public async create() {
    await this.page.setContent(`
        <oe-spectrogram id="spectrogram" src="${this.audioSource}"></oe-spectrogram>
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
}

export const singleSpectrogramFixture = test.extend<{ fixture: SingleSpectrogramFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new SingleSpectrogramFixture(page);
    await fixture.create();
    await run(fixture);
  },
});
