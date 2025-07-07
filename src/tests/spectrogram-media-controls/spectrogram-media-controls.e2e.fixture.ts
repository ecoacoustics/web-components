import { Locator, Page } from "@playwright/test";
import { SpectrogramComponent } from "../../components/spectrogram/spectrogram";
import { getBrowserValue, hasBrowserAttribute, waitForContentReady } from "../helpers";
import { createFixture } from "../fixtures";

class TestPage {
  public constructor(public readonly page: Page) {}

  public spectrogramOne = () => this.page.getByTestId("spectrogram-one").first();
  public spectrogramTwo = () => this.page.getByTestId("spectrogram-two").first();
  public componentOneAudioElement = () => this.page.locator("#first audio").first();
  public componentTwoAudioElement = () => this.page.locator("#second audio").first();
  public mediaControls = () => this.page.locator("oe-media-controls").first();
  public mediaControlsActionButton = () => this.page.locator("oe-media-controls #action-button").first();
  private audioSource = "http://localhost:3000/example.flac";

  public async create() {
    await this.page.setContent(`
      <oe-spectrogram
        data-testid="spectrogram-one"
        id="first"
        src="${this.audioSource}"
      ></oe-spectrogram>
      <oe-spectrogram
        data-testid="spectrogram-two"
        id="second"
        src="${this.audioSource}"
      ></oe-spectrogram>
      <oe-media-controls for="first"></oe-media-controls>
    `);
    await waitForContentReady(this.page, ["oe-spectrogram", "oe-media-controls"]);
  }

  public async createWithSameIds() {
    await this.page.setContent(`
      <oe-spectrogram
        data-testid="spectrogram-one"
        id="first"
        src="${this.audioSource}"
      ></oe-spectrogram>
      <oe-spectrogram
        data-testid="spectrogram-two"
        id="first"
        src="${this.audioSource}"
      ></oe-spectrogram>
      <oe-media-controls for="first"></oe-media-controls>
    `);
    await waitForContentReady(this.page, ["oe-spectrogram", "oe-media-controls"]);
  }

  public async isPlayingAudio(component: Locator): Promise<boolean> {
    const mediaElement = component.locator("audio").first();
    const hasDocumentAttribute = !(await hasBrowserAttribute<SpectrogramComponent>(component, "paused"));
    const hasObjectProperty = !(await getBrowserValue<HTMLAudioElement, boolean>(mediaElement, "paused"));

    return hasDocumentAttribute && hasObjectProperty;
  }

  public async playAudio() {
    await this.mediaControlsActionButton().click();
  }

  public async pauseAudio() {
    await this.mediaControlsActionButton().click();
  }
}

export const multipleSpectrogramFixture = createFixture(TestPage);
