import { Page } from "@playwright/test";
import { setBrowserAttribute, waitForContentReady } from "../helpers/helpers";
import { SpectrogramComponent } from "../../components/spectrogram/spectrogram";
import { expect } from "../assertions";
import { Seconds } from "../../models/unitConverters";
import { createFixture, setContent } from "../fixtures";

class TestPage {
  public constructor(public readonly page: Page) {}

  public indicatorComponent = () => this.page.locator("oe-indicator").first();
  public indicatorGroup = () => this.page.locator("oe-indicator #indicator-group").first();
  public spectrogramComponent = () => this.page.locator("oe-spectrogram").first();
  public audioElement = () => this.page.locator("audio").first();
  public mediaControlsActionButton = () => this.page.locator("oe-media-controls #action-button").first();

  public async create() {
    await setContent(
      this.page,
      `
      <oe-indicator>
        <oe-spectrogram
          id="spectrogram"
          style="width: 200px; height: 200px;"
          src="http://localhost:3000/example.flac"
        ></oe-spectrogram>
      </oe-indicator>
      <oe-media-controls for="spectrogram"></oe-media-controls>
   `,
    );

    await waitForContentReady(this.page, ["oe-indicator", "oe-spectrogram", "oe-media-controls"]);
  }

  public async removeSpectrogramElement() {
    const element = this.spectrogramComponent();
    await element.evaluate((element) => {
      element.remove();
    });
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
    await this.toggleAudio(false);
  }

  public async pauseAudio() {
    await this.toggleAudio(true);
  }

  // This will likely be async in the future, so I have made it async to prevent
  // breaking changes in the future.
  // eslint-disable-next-line @typescript-eslint/require-await
  public async audioDuration(): Promise<Seconds> {
    return 6;
  }

  private async toggleAudio(isPaused: boolean) {
    await this.mediaControlsActionButton().click();
    await expect(this.audioElement()).toHaveJSProperty("paused", isPaused);
  }
}

export const indicatorSpectrogramMediaControlsFixture = createFixture(TestPage);
