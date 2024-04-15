import { Page } from "@playwright/test";
import { test } from "@sand4rt/experimental-ct-web";
import { getBrowserValue } from "../helpers";
import { Indicator } from "indicator/indicator";

class TestPage {
  public constructor(public readonly page: Page) {}

  public indicatorComponent = () => this.page.locator("oe-indicator");
  public spectrogramComponent = () => this.page.locator("oe-spectrogram");
  public mediaControlsActionButton = () => this.page.locator("oe-media-controls #action-button");
  private audioSource = "/example.flac";

  public async create() {
    await this.page.setContent(`
      <oe-indicator>
        <oe-spectrogram
          id="spectrogram"
          style="width: 200px; height: 200px;"
          src="${this.audioSource}"
        ></oe-spectrogram>
      </oe-indicator>
      <oe-media-controls for="spectrogram"></oe-media-controls>
   `);
    await this.page.waitForLoadState("networkidle");
  }

  public async indicatorPosition(): Promise<number> {
    return (await getBrowserValue<Indicator>(this.indicatorComponent(), "xPos")) as number;
  }

  public async toggleAudio() {
    await this.mediaControlsActionButton().click();
  }

  public async playAudio() {
    await this.toggleAudio();
  }

  public async pauseAudio() {
    await this.toggleAudio();
  }

  public async audioDuration(): Promise<number> {
    return 6_000;
  }
}

export const indicatorSpectrogramMediaControlsFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, use) => {
    const fixture = new TestPage(page);
    await fixture.create();
    await use(fixture);
  },
});
