import { Page } from "@playwright/test";
import { test } from "@sand4rt/experimental-ct-web";
import { Spectrogram } from "./spectrogram";
import { getBrowserValue, hasBrowserAttribute } from "../../tests/helpers";

class SingleSpectrogramFixture {
  public constructor(public readonly page: Page) {}

  public spectrogram = this.page.locator("oe-spectrogram").first();
  public spectrogramAudioElement = this.page.locator("oe-spectrogram audio").first();
  public mediaControls = this.page.locator("oe-media-controls").first();
  public mediaControlsActionButton = this.page.locator("oe-media-controls #action-button").first();
  public audioSource = "/example.flac";

  public async create() {
    await this.page.setContent(`
        <oe-spectrogram id="spectrogram" src="${this.audioSource}"></oe-spectrogram>
        <oe-media-controls for="spectrogram"></oe-media-controls>
    `);
    await this.page.waitForLoadState("networkidle");
  }

  public async updateSlot(content: string) {
    const componentElement = this.spectrogram;
    await componentElement.evaluate((element: HTMLElement, content: string) => {
      element.innerHTML = content;
    }, content);
  }

  public async isPlayingAudio(): Promise<boolean> {
    const hasDocumentAttribute = !(await hasBrowserAttribute<Spectrogram>(this.spectrogram, "paused"));
    const hasObjectProperty = !(await getBrowserValue<HTMLAudioElement>(this.spectrogramAudioElement, "paused"));

    return hasDocumentAttribute && hasObjectProperty;
  }
}

export const singleSpectrogramFixture = test.extend<{ fixture: SingleSpectrogramFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new SingleSpectrogramFixture(page);
    await fixture.create();
    await run(fixture);
  },
});
