import { test, Page } from "@playwright/test";

// this fixture involves all the components that we have developed interacting together
// in their expected use cases
class TestPage {
  public constructor(public readonly page: Page) {}

  public indicatorComponent = () => this.page.locator("oe-indicator").first();
  public spectrogramComponent = () => this.page.locator("oe-spectrogram").first();
  public mediaControlsComponent = () => this.page.locator("oe-media-controls").first();
  public actionButton = () => this.page.locator("oe-media-controls #action-button").first();
  private audioSource = "/example.flac";

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

  public async addElement(template: string) {
    await this.page.setContent(template);
    await this.page.waitForLoadState("networkidle");
  }

  public async removeElement(selector: string) {
    const element = this.page.locator(selector).first();
    await element.evaluate((element) => element.remove());
  }

  public async playAudio() {
    const actionButtonElement = this.actionButton();
    await actionButtonElement.click();
  }

  public async pauseAudio() {
    const actionButtonElement = this.actionButton();
    await actionButtonElement.click();
  }

  public async isAudioPlaying() {}
}

export const fullFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await fixture.create();
    await run(fixture);
  },
});
