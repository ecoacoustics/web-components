import { Locator, Page } from "@playwright/test";
import { test } from "@sand4rt/experimental-ct-web";
import { Spectrogram } from "spectrogram/Spectrogram";
import { getBrowserValue, hasBrowserAttribute } from "../helpers";

class MultipleSpectrogramFixture {
  public constructor(public readonly page: Page) {}

  public spectrogramOne = this.page.locator("oe-spectrogram#first").first();
  public spectrogramTwo = this.page.locator("oe-spectrogram#second").first();
  public componentOneAudioElement = this.page.locator("#first audio").first();
  public componentTwoAudioElement = this.page.locator("#second audio").first();
  public mediaControls = this.page.locator("oe-media-controls").first();
  public mediaControlsActionButton = this.page.locator("oe-media-controls #action-button").first();
  private audioSource = "/example.flac";

  public async create() {
    await this.page.setContent(`
        <oe-spectrogram id="first" src="${this.audioSource}"></oe-spectrogram>
        <oe-spectrogram id="second" src="${this.audioSource}"></oe-spectrogram>
        <oe-media-controls for="first"></oe-media-controls>
    `);
    await this.page.waitForLoadState("networkidle");
  }

  public async isPlayingAudio(component: Locator): Promise<boolean> {
    const mediaElement = await component.locator("audio").first();
    const hasDocumentAttribute = !(await hasBrowserAttribute<Spectrogram>(component, "paused"));
    const hasObjectProperty = !(await getBrowserValue<HTMLAudioElement>(mediaElement, "paused"));

    return hasDocumentAttribute && hasObjectProperty;
  }
}

export const multipleSpectrogramFixture = test.extend<{ fixture: MultipleSpectrogramFixture }>({
  fixture: async ({ page }, run) => {
    const fixture = new MultipleSpectrogramFixture(page);
    await fixture.create();
    await run(fixture);
  },
});
