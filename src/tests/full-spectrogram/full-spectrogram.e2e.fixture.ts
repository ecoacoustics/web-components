import { Page } from "@playwright/test";
import { test } from "@sand4rt/experimental-ct-web";
import { SpectrogramComponent } from "../../components/spectrogram/spectrogram";
import { getBrowserValue } from "../helpers";

// this fixture involves all the components that we have developed interacting together
// in their expected use cases
class TestPage {
  public constructor(public readonly page: Page) {}

  public indicatorComponent = () => this.page.locator("oe-indicator").first();
  public spectrogramComponent = () => this.page.locator("oe-spectrogram").first();
  public mediaControlsComponent = () => this.page.locator("oe-media-controls").first();
  public actionButton = () => this.page.locator("oe-media-controls #action-button").first();
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
    await this.page.waitForLoadState("networkidle");
  }

  public async removeElement(selector: string) {
    const element = this.page.locator(selector).first();
    await element.evaluate((element) => element.remove());
  }

  public async pressSpaceBar() {
    const target = this.spectrogramComponent();
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
}

export const fullFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await fixture.create();
    await run(fixture);
  },
});
