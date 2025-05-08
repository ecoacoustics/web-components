import { Page } from "@playwright/test";
import { catchLocatorEvent, setBrowserAttribute, waitForContentReady } from "../helpers";
import { SpectrogramComponent } from "../../components/spectrogram/spectrogram";
import { test } from "../assertions";
import { Seconds } from "../../models/unitConverters";

class TestPage {
  public constructor(public readonly page: Page) {}

  public indicatorComponent = () => this.page.locator("oe-indicator").first();
  public indicatorGroup = () => this.page.locator("oe-indicator #indicator-group").first();
  public spectrogramComponent = () => this.page.locator("oe-spectrogram").first();
  public audioElement = () => this.page.locator("audio").first();
  public mediaControlsActionButton = () => this.page.locator("oe-media-controls #action-button").first();

  public async create() {
    await this.page.setContent(`
      <oe-indicator>
        <oe-spectrogram
          id="spectrogram"
          style="width: 200px; height: 200px;"
          src="http://localhost:3000/example.flac"
        ></oe-spectrogram>
      </oe-indicator>
      <oe-media-controls for="spectrogram"></oe-media-controls>
   `);

    await waitForContentReady(this.page, ["oe-indicator", "oe-spectrogram", "oe-media-controls"]);
  }

  public async removeSpectrogramElement() {
    const element = this.spectrogramComponent();
    await element.evaluate((element) => element.remove());
  }

  public async changeSpectrogramAudioSource(newSource: string) {
    const element = this.spectrogramComponent();
    await setBrowserAttribute<SpectrogramComponent>(element, "src", newSource);
  }

  public async indicatorPosition(): Promise<number> {
    return await this.indicatorGroup().evaluate((element: SVGLineElement) => {
      const styles = window.getComputedStyle(element);

      // we use the 2d DomMatrix key for translateX (e) instead of the
      // 3d translateX (m41) DomMatrix key because MacOS does not update
      // the 3d DomMatrix value when using a transform style
      const domMatrixTranslateXKey: keyof DOMMatrix = "e";
      const domMatrix = new DOMMatrix(styles.transform);
      return domMatrix[domMatrixTranslateXKey];
    });
  }

  public async playAudio() {
    await this.toggleAudio();
  }

  public async pauseAudio() {
    await this.toggleAudio();
  }

  public async audioDuration(): Promise<Seconds> {
    return 6;
  }

  private async toggleAudio() {
    const playEvent = catchLocatorEvent(this.audioElement(), "play");
    await this.mediaControlsActionButton().click();

    // clicking the play button might result in the audio file being downloaded
    // from the testing server. We wait for the network to be idle to ensure
    // that the audio file has been downloaded before we make any assertions
    await playEvent;
  }
}

export const indicatorSpectrogramMediaControlsFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, use) => {
    const fixture = new TestPage(page);
    await fixture.create();
    await use(fixture);
  },
});
