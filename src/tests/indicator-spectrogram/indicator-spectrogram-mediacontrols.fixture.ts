import { Page } from "@playwright/test";
import { test } from "@sand4rt/experimental-ct-web";
import { getBrowserValue, setBrowserAttribute } from "../helpers";
import { Indicator } from "indicator/indicator";
import { Spectrogram } from "../../components/spectrogram/spectrogram";

class TestPage {
  public constructor(public readonly page: Page) {}

  public indicatorComponent = () => this.page.locator("oe-indicator").first();
  public spectrogramComponent = () => this.page.locator("oe-spectrogram").first();
  public mediaControlsActionButton = () => this.page.locator("oe-media-controls #action-button").first();

  public async create() {
    await this.page.setContent(`
      <oe-indicator>
        <oe-spectrogram
          id="spectrogram"
          style="width: 200px; height: 200px;"
          src="/example.flac"
        ></oe-spectrogram>
      </oe-indicator>
      <oe-media-controls for="spectrogram"></oe-media-controls>
   `);
    await this.page.waitForLoadState("networkidle");
  }

  public async removeSpectrogramElement() {
    const element = this.spectrogramComponent();
    await element.evaluate((element) => element.remove());
  }

  public async changeSpectrogramAudioSource(newSource: string) {
    const element = this.spectrogramComponent();
    await setBrowserAttribute<Spectrogram>(element, "src", newSource);
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
