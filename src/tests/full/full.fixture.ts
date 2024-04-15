import { test, Page } from "@playwright/test";

// this fixture involves all the components that we have developed interacting together
// in their expected use cases
class TestPage {
  public constructor(public readonly page: Page) {}

  public indicatorComponent = () => this.page.locator("oe-indicator");
  public spectrogramComponent = () => this.page.locator("oe-spectrogram");
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
}

export const fullFixture = test.extend<{ fixture: TestPage }>({
  fixture: async ({ page }, run) => {
    const fixture = new TestPage(page);
    await fixture.create();
    await run(fixture);
  },
});
